import type { ExternalModuleManifest, SystemAPI, Permission, IPCMessage } from './types';

export interface SandboxV2Config {
  manifest: ExternalModuleManifest;
  systemAPI: SystemAPI;
  bundleCode?: string;
  onMessage?(msg: IPCMessage): void;
  onError?(error: Error): void;
  resourceLimits?: ResourceLimits;
}

export interface ResourceLimits {
  maxMemoryMB?: number;
  maxExecutionMs?: number;
  maxMessageSizeKB?: number;
  maxStorageItems?: number;
}

const DEFAULT_LIMITS: Required<ResourceLimits> = {
  maxMemoryMB: 64,
  maxExecutionMs: 5000,
  maxMessageSizeKB: 100,
  maxStorageItems: 100,
};

export class SandboxV2 {
  private config: SandboxV2Config;
  private limits: Required<ResourceLimits>;
  private iframe: HTMLIFrameElement | null = null;
  private pending = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  private lifecyclePending = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  private lifecycleId = 0;
  private messageId = 0;
  private messageCount = 0;
  private _destroyed = false;

  constructor(config: SandboxV2Config) {
    this.config = config;
    this.limits = { ...DEFAULT_LIMITS, ...config.resourceLimits };
  }

  get destroyed(): boolean {
    return this._destroyed;
  }

  mount(parent: HTMLElement): void {
    if (this.iframe) throw new Error('SandboxV2 already mounted');

    const iframe = document.createElement('iframe');
    iframe.setAttribute(
      'sandbox',
      ['allow-scripts', 'allow-same-origin', 'allow-popups'].join(' '),
    );
    iframe.style.cssText = 'border:none;width:100%;height:100%;display:block';
    iframe.srcdoc = this.buildSandboxHTML();

    this.iframe = iframe;
    parent.appendChild(iframe);

    window.addEventListener('message', this.handleMessage);
  }

  unmount(): void {
    this._destroyed = true;
    window.removeEventListener('message', this.handleMessage);

    if (this.iframe?.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
    this.iframe = null;

    for (const { reject } of this.pending.values()) {
      reject(new Error('Sandbox destroyed'));
    }
    this.pending.clear();
  }

  postMessage(type: string, payload?: unknown): void {
    if (!this.iframe?.contentWindow) return;

    const msg: IPCMessage = {
      id: `host-${++this.messageId}`,
      type: 'event',
      source: 'system',
      event: type,
      payload,
      timestamp: Date.now(),
    };

    this.iframe.contentWindow.postMessage(msg, '*');
  }

  private buildSandboxHTML(): string {
    const code = this.config.bundleCode ?? '';
    const escapedCode = code.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

    const moduleScript = escapedCode
      ? `<script type="module">
const bridge = window.__BRIDGE__;
try {
  const mod = await import('data:text/javascript;base64,' + btoa(unescape(encodeURIComponent(\`${escapedCode}\`))));
  if (mod.registerAPI) mod.registerAPI(bridge);
  if (mod.api) bridge.registerAPI(mod.api);
  if (mod.default) {
    if (typeof mod.default === 'function') mod.default(bridge);
    else if (mod.default.api) bridge.registerAPI(mod.default.api);
    else bridge.registerAPI(mod.default);
  }
} catch (e) {
  console.error('[module] init error:', e);
  bridge.call('logger.error', ['Module', 'Init error: ' + e.message]);
}
<` + `/script>`
      : '';

    const html =
      "<!DOCTYPE html>\n<html>\n<head><meta charset=\"utf-8\"></head>\n<body>\n<div id=\"root\"></div>\n<script>\nvar bridge = {\n  _pending: new Map(),\n  _id: 0,\n  _hooks: {},\n\n  call: function(method, payload) {\n    return new Promise(function(resolve, reject) {\n      var id = ++bridge._id;\n      bridge._pending.set(id, { resolve: resolve, reject: reject });\n      window.parent.postMessage({ type: 'request', id: id, method: method, payload: payload, source: 'module' }, '*');\n    });\n  },\n\n  on: function(method, handler) {\n    bridge._listeners = bridge._listeners || new Map();\n    bridge._listeners.set(method, handler);\n  },\n\n  registerAPI: function(hooks) {\n    bridge._hooks = hooks || {};\n  },\n\n  getAPI: function() {\n    return bridge._hooks;\n  },\n\n  _handleResponse: function(msg) {\n    var pending = bridge._pending.get(msg.id);\n    if (!pending) return;\n    bridge._pending.delete(msg.id);\n    if (msg.error) pending.reject(new Error(msg.error));\n    else pending.resolve(msg.payload);\n  },\n};\n\nwindow.addEventListener('message', function(event) {\n  var msg = event.data;\n  if (!msg || typeof msg !== 'object') return;\n  if (msg.type === 'response') {\n    bridge._handleResponse(msg);\n  } else if (msg.type === 'event') {\n    var handler = bridge._listeners ? bridge._listeners.get(msg.event) : null;\n    if (handler) handler(msg.payload);\n  } else if (msg.type === 'call-lifecycle') {\n    var fn = bridge._hooks[msg.method];\n    if (typeof fn === 'function') {\n      Promise.resolve(fn(msg.payload)).then(function(result) {\n        window.parent.postMessage({ type: 'lifecycle-result', id: msg.id, result: result }, '*');\n      }).catch(function(err) {\n        window.parent.postMessage({ type: 'lifecycle-result', id: msg.id, error: err.message }, '*');\n      });\n    }\n  }\n});\n\nwindow.__BRIDGE__ = bridge;\n<" +
      '/script>\n' +
      moduleScript +
      '\n</body>\n</html>';

    return html;
  }

  async callLifecycle(method: string, payload?: unknown): Promise<unknown> {
    if (!this.iframe?.contentWindow) throw new Error('Sandbox not mounted');
    const id = `lc-${++this.lifecycleId}`;
    return new Promise((resolve, reject) => {
      this.lifecyclePending.set(id, { resolve, reject });
      this.iframe!.contentWindow!.postMessage(
        { type: 'call-lifecycle', id, method, payload, source: 'system' },
        '*',
      );
    });
  }

  private handleMessage = (event: MessageEvent): void => {
    if (this._destroyed) return;
    if (event.source !== this.iframe?.contentWindow) return;

    const msg = event.data as IPCMessage;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'request') {
      this.handleRequest(msg);
    } else if (msg.type === 'response') {
      this.handleResponse(msg);
    } else if (msg.type === 'lifecycle-result') {
      const pending = this.lifecyclePending.get(msg.id);
      if (!pending) return;
      this.lifecyclePending.delete(msg.id);
      if (msg.error) pending.reject(new Error(msg.error as string));
      else pending.resolve(msg.result);
    }
  };

  private resolveNested(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((acc, part) => {
      if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part];
      return undefined;
    }, obj as unknown);
  }

  private async handleRequest(msg: IPCMessage): Promise<void> {
    const method = msg.method;
    if (!method) {
      this.postResponse(msg, null, 'No method specified');
      return;
    }

    this.messageCount++;

    if (this.messageCount > this.limits.maxStorageItems) {
      this.postResponse(msg, null, 'Message rate limit exceeded');
      return;
    }

    const api = this.buildAPIBridge();
    const fn = this.resolveNested(api, method);

    if (typeof fn !== 'function') {
      this.postResponse(msg, null, `API method '${method}' not available`);
      return;
    }

    try {
      const result = await Promise.race([
        fn(msg.payload),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Execution timeout')), this.limits.maxExecutionMs),
        ),
      ]);
      this.postResponse(msg, result);
    } catch (err) {
      this.postResponse(msg, null, err instanceof Error ? err.message : String(err));
    }
  }

  private handleResponse(msg: IPCMessage): void {
    const pending = this.pending.get(msg.id);
    if (!pending) return;
    this.pending.delete(msg.id);
    if (msg.error) {
      pending.reject(new Error(msg.error));
    } else {
      pending.resolve(msg.payload);
    }
  }

  private postResponse(msg: IPCMessage, payload: unknown, error?: string): void {
    if (!this.iframe?.contentWindow) return;
    const response: IPCMessage = {
      id: msg.id,
      type: 'response',
      source: 'system',
      payload,
      error,
      timestamp: Date.now(),
    };
    this.iframe.contentWindow.postMessage(response, '*');
  }

  private buildAPIBridge(): Record<string, unknown> {
    const perms = new Set(this.config.manifest.permissions ?? []);
    const check = (perm: Permission): boolean => perms.has(perm);
    const api = this.config.systemAPI;

    const bridge: Record<string, unknown> = {};

    bridge.openWindow = (config: Parameters<SystemAPI['openWindow']>[0]) => api.openWindow(config);
    bridge.closeWindow = (windowId: string) => api.closeWindow(windowId);
    bridge.notify = (
      type: Parameters<SystemAPI['notify']>[0],
      message: Parameters<SystemAPI['notify']>[1],
      options?: Parameters<SystemAPI['notify']>[2],
    ) => api.notify(type, message, options);
    bridge.theme = api.theme;
    bridge.logger = api.logger;

    if (check('storage:read') || check('storage:write')) {
      bridge.storage = {
        get: check('storage:read')
          ? (key: string) => api.storage.get(key)
          : () => {
              throw new Error('Permission denied: storage:read');
            },
        set: check('storage:write')
          ? (key: string, value: unknown) => api.storage.set(key, value)
          : () => {
              throw new Error('Permission denied: storage:write');
            },
        delete: check('storage:write')
          ? (key: string) => api.storage.delete(key)
          : () => {
              throw new Error('Permission denied: storage:write');
            },
      };
    }

    bridge.settings = api.settings;

    return bridge;
  }
}
