import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { CreateModuleOptions } from './types';

const MODULE_JSON_TEMPLATE = (opts: {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}) => `{
  "id": "${opts.id}",
  "name": "${opts.name}",
  "version": "0.1.0",
  "description": "${opts.description}",
  "icon": "extension",
  "entry": "./src/index.ts",
  "type": "external",
  "permissions": ${JSON.stringify(opts.permissions, null, 2)},
  "author": "",
  "homepage": "",
  "categories": ["uncategorized"]
}
`;

const INDEX_TEMPLATE = `
export const api = {
  mount(params?: Record<string, unknown>): string {
    return \`\${params?.message ?? "Module mounted"}\`;
  },
};

export default api;
`.trimStart();

export async function createModule(options: CreateModuleOptions): Promise<string> {
  const id = options.name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^[^a-z]/, 'm-');

  const targetDir = resolve(options.dir ?? process.cwd(), id);
  const srcDir = join(targetDir, 'src');

  await mkdir(srcDir, { recursive: true });

  await writeFile(
    join(targetDir, 'module.json'),
    MODULE_JSON_TEMPLATE({
      id,
      name: options.name,
      description: options.description ?? `${options.name} module`,
      permissions: options.permissions ?? [],
    }),
  );

  await writeFile(join(srcDir, 'index.ts'), INDEX_TEMPLATE);

  await writeFile(
    join(targetDir, '.gitignore'),
    'node_modules/\ndist/\n',
  );

  return targetDir;
}
