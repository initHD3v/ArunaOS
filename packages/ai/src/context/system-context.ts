import type { SystemContext } from '../types';

export async function createSystemContext(): Promise<SystemContext> {
  const isBrowser = typeof window !== 'undefined';

  return {
    os: {
      platform: isBrowser ? navigator.platform : 'server',
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
      uptime: isBrowser ? Math.floor((Date.now() - performance.now()) / 1000) : 0,
    },
    workspace: {
      activeWindows: 0,
      activeWorkspace: 'default',
      theme: isBrowser ? (document.documentElement.getAttribute('data-theme') ?? 'dark') : 'dark',
    },
    modules: {
      total: 0,
      active: 0,
      installed: [],
    },
    resources: {
      memoryUsage: isBrowser
        ? ((performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
            ?.usedJSHeapSize ?? 0)
        : 0,
      cpuUsage: 0,
    },
  };
}

export function formatSystemContext(ctx: SystemContext): string {
  return [
    '## System Context',
    '',
    `- Platform: ${ctx.os.platform}`,
    `- Version: ${ctx.os.version}`,
    `- Theme: ${ctx.workspace.theme}`,
    `- Active Workspace: ${ctx.workspace.activeWorkspace}`,
    `- Active Windows: ${ctx.workspace.activeWindows}`,
    `- Modules: ${ctx.modules.active}/${ctx.modules.total} active`,
    `- Installed Modules: ${ctx.modules.installed.map((m) => m.name).join(', ') || 'None'}`,
    `- Memory Usage: ${(ctx.resources.memoryUsage / 1024 / 1024).toFixed(1)} MB`,
    '',
  ].join('\n');
}
