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
  if (text.includes('network') || text.includes('api') || text.includes('fetch') || text.includes('http')) {
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
  if (text.includes('edit') || text.includes('media') || text.includes('video') || text.includes('image')) return 'media';
  if (text.includes('dev') || text.includes('code') || text.includes('debug') || text.includes('terminal')) return 'development';
  if (text.includes('tool') || text.includes('util') || text.includes('convert')) return 'tools';
  if (text.includes('product') || text.includes('task') || text.includes('organize') || text.includes('calendar')) return 'productivity';

  return 'utilities';
}

function generateCode(name: string, description: string, capabilities?: string[]): string {
  const id = sanitizeId(name);
  const capList = capabilities?.map((c) => `  // Handle capability: ${c}`).join('\n') ?? '';

  return `
export const api = {
  metadata: {
    name: '${name}',
    description: '${description}',
  },

  mount(params?: Record<string, unknown>): string {
    console.log('[${id}] mounted with params:', params);
    return '${name} loaded successfully';
  },

  unmount(): void {
    console.log('[${id}] unmounted');
  },

  // ── API Methods ──
  async execute(input?: Record<string, unknown>): Promise<Record<string, unknown>> {
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
