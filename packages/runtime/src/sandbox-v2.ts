import type { ExternalModuleManifest, SystemAPI, Permission, IPCMessage } from './types';

export interface SandboxV2Config {
  manifest: ExternalModuleManifest;
  systemAPI: SystemAPI;
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
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
const bridge = {
  _pending: new Map(),
  _id: 0,

  call(method, payload) {
    return new Promise((resolve, reject) => {
      const id = ++this._id;
      this._pending.set(id, { resolve, reject });
      window.parent.postMessage({ type: 'request', id, method, payload, source: 'module' }, '*');
    });
  },

  on(method, handler) {
    this._listeners = this._listeners || new Map();
    this._listeners.set(method, handler);
  },

  _handleResponse(msg) {
    const pending = this._pending.get(msg.id);
    if (!pending) return;
    this._pending.delete(msg.id);
    if (msg.error) pending.reject(new Error(msg.error));
    else pending.resolve(msg.payload);
  },
};

window.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'response') {
    bridge._handleResponse(msg);
  } else if (msg.type === 'event') {
    const handler = bridge._listeners?.get(msg.event);
    if (handler) handler(msg.payload);
  }
});

window.__BRIDGE__ = bridge;
</script>
</body>
</html>`;
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
    }
  };

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
    const fn = (api as Record<string, unknown>)[method];

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
