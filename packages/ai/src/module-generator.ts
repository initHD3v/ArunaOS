export interface GeneratorOptions {
  name: string;
  description: string;
  capabilities?: string[];
}

export interface GeneratorResult {
  id: string;
  code: string;
  manifest: Record<string, unknown>;
  files: Array<{ path: string; content: string }>;
}

function sanitizeId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^[^a-z]/, 'm-');
}

// Simple keyword-based permission inference
function inferPermissions(description: string, capabilities?: string[]): string[] {
  const perms = new Set<string>();
  const text = `${description} ${(capabilities ?? []).join(' ')}`.toLowerCase();

  if (text.includes('file') || text.includes('document') || text.includes('save')) {
    perms.add('storage:read');
    perms.add('storage:write');
  }
  if (text.includes('camera') || text.includes('photo') || text.includes('picture')) {
    perms.add('camera');
  }
  if (text.includes('microphone') || text.includes('record') || text.includes('audio')) {
    perms.add('microphone');
  }
  if (text.includes('notify') || text.includes('alert') || text.includes('remind')) {
    perms.add('notification');
  }
  if (text.includes('clipboard') || text.includes('copy') || text.includes('paste')) {
    perms.add('clipboard:read');
    perms.add('clipboard:write');
  }
  if (
    text.includes('network') ||
    text.includes('api') ||
    text.includes('fetch') ||
    text.includes('http')
  ) {
    perms.add('network');
  }
  if (text.includes('location') || text.includes('map') || text.includes('geo')) {
    perms.add('geolocation');
  }

  return Array.from(perms);
}

function inferCategory(description: string, capabilities?: string[]): string {
  const text = `${description} ${(capabilities ?? []).join(' ')}`.toLowerCase();

  if (text.includes('game') || text.includes('play')) return 'games';
  if (
    text.includes('edit') ||
    text.includes('media') ||
    text.includes('video') ||
    text.includes('image')
  )
    return 'media';
  if (
    text.includes('dev') ||
    text.includes('code') ||
    text.includes('debug') ||
    text.includes('terminal')
  )
    return 'development';
  if (text.includes('tool') || text.includes('util') || text.includes('convert')) return 'tools';
  if (
    text.includes('product') ||
    text.includes('task') ||
    text.includes('organize') ||
    text.includes('calendar')
  )
    return 'productivity';

  return 'utilities';
}

function generateCode(name: string, description: string, capabilities?: string[]): string {
  const id = sanitizeId(name);
  const capList = capabilities?.map((c) => `  // Handle capability: ${c}`).join('\n') ?? '';

  // Calculator modules get a real, runnable UI + arithmetic logic. The code
  // must stay plain JavaScript (no imports) — it is executed inside the
  // SandboxV2 iframe via a data: URL module import.
  const text = `${description} ${(capabilities ?? []).join(' ')}`.toLowerCase();
  if (text.includes('kalkulator') || text.includes('calculator')) {
    return `
const state = { display: '0', prev: null, op: null, fresh: true };

function compute(a, b, op) {
  switch (op) {
    case '+': return a + b;
    case '\u2212': return a - b;
    case '\u00d7': return a * b;
    case '\u00f7': return b === 0 ? NaN : a / b;
    default: return b;
  }
}

export function execute(input) {
  const a = Number(input && input.a);
  const b = Number(input && input.b);
  const op = input && (input.operation || input.op);
  if (!op || isNaN(a) || isNaN(b)) {
    return { status: 'error', message: 'Need { a: number, b: number, operation: "add"|"subtract"|"multiply"|"divide" }' };
  }
  const map = { add: '+', subtract: '\\u2212', multiply: '\\u00d7', divide: '\\u00f7' };
  const result = compute(a, b, map[op]);
  return { status: 'ok', result: result, expression: a + ' ' + map[op] + ' ' + b + ' = ' + result };
}

export const api = {
  metadata: { name: '${name}', description: '${description}' },

  mount() {
    const root = document.getElementById('root');
    if (!root) return;
    root.innerHTML = '';
    root.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:system-ui;background:#111;color:#fff;';

    const screen = document.createElement('div');
    screen.id = 'calc-screen';
    screen.style.cssText = 'width:240px;padding:14px;margin-bottom:10px;background:#1e1e1e;border-radius:10px;font-size:26px;text-align:right;min-height:32px;';
    screen.textContent = state.display;

    const pad = document.createElement('div');
    pad.style.cssText = 'display:grid;grid-template-columns:repeat(4,60px);gap:6px;';

    const buttons = ['7','8','9','\\u00f7','4','5','6','\\u00d7','1','2','3','\\u2212','0','C','=','+'];
    for (const label of buttons) {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.dataset.key = label;
      btn.style.cssText = 'height:52px;border:none;border-radius:10px;font-size:20px;background:#2c2c2c;color:#fff;cursor:pointer;';
      if (label === '=') btn.style.background = '#2563eb';
      if (label === 'C') btn.style.background = '#7f1d1d';
      pad.appendChild(btn);
    }

    pad.addEventListener('click', function (ev) {
      const key = ev.target && ev.target.dataset ? ev.target.dataset.key : null;
      if (!key) return;
      if (key === 'C') {
        state.display = '0'; state.prev = null; state.op = null; state.fresh = true;
      } else if ('\\u00f7\\u00d7\\u2212+'.indexOf(key) !== -1) {
        state.prev = parseFloat(state.display); state.op = key; state.fresh = true;
      } else if (key === '=') {
        if (state.op !== null && state.prev !== null) {
          const b = parseFloat(state.display);
          const r = compute(state.prev, b, state.op);
          state.display = String(r); state.prev = null; state.op = null; state.fresh = true;
        }
      } else {
        state.display = state.fresh || state.display === '0' ? key : state.display + key;
        state.fresh = false;
      }
      screen.textContent = state.display;
    });

    root.appendChild(screen);
    root.appendChild(pad);
    return '${name} ready';
  },

  unmount() {
    const root = document.getElementById('root');
    if (root) root.innerHTML = '';
  },

  async execute(input) {
${capList}
    return execute(input);
  },
};

export default api;
`.trimStart();
  }

  return `
export const api = {
  metadata: {
    name: '${name}',
    description: '${description}',
  },

  mount(params) {
    console.log('[${id}] mounted with params:', params);
    return '${name} loaded successfully';
  },

  unmount() {
    console.log('[${id}] unmounted');
  },

  // ── API Methods ──
  async execute(input) {
${capList}
    return {
      status: 'ok',
      message: 'Executed ${name}',
      timestamp: Date.now(),
      input: input ?? null,
    };
  },
};

export default api;
`.trimStart();
}

function generateManifest(options: GeneratorOptions): Record<string, unknown> {
  const id = sanitizeId(options.name);
  const permissions = inferPermissions(options.description, options.capabilities);
  const category = inferCategory(options.description, options.capabilities);

  return {
    id,
    name: options.name,
    version: '0.1.0',
    description: options.description,
    icon: 'sparkles',
    entry: './src/index.ts',
    type: 'external',
    permissions,
    author: '',
    homepage: '',
    categories: [category],
  };
}

export class ModuleGenerator {
  generate(options: GeneratorOptions): GeneratorResult {
    const id = sanitizeId(options.name);
    const manifest = generateManifest(options);
    const code = generateCode(options.name, options.description, options.capabilities);
    const permissions = manifest.permissions as string[];

    const files: GeneratorResult['files'] = [
      {
        path: 'module.json',
        content: JSON.stringify(manifest, null, 2),
      },
      {
        path: 'src/index.ts',
        content: code,
      },
      {
        path: '.gitignore',
        content: 'node_modules/\ndist/\n',
      },
      {
        path: 'README.md',
        content: `# ${options.name}\n\n${options.description}\n\n## Permissions\n\n${permissions.length > 0 ? permissions.map((p: string) => `- \`${p}\``).join('\n') : 'None'}\n\n## API\n\n- \`mount(params?)\` — Initialize the module\n- \`unmount()\` — Clean up\n- \`execute(input?)\` — Main functionality\n`,
      },
    ];

    return { id, code, manifest, files };
  }
}
