'use client';

import { useService } from '@/providers/service-provider';
import { useWindowStore } from '@/features/window-manager/stores/window.store';
import type { ModuleRegistry, ModuleLoader, ModuleStore } from '@arunaos/runtime';
import { InstalledModules } from './components/installed-modules';

export function ModuleInstaller() {
  const registry = useService<ModuleRegistry>('moduleRegistry');
  const loader = useService<ModuleLoader>('moduleLoader');
  const store = useService<ModuleStore>('moduleStore');

  const openWindow = useWindowStore((s) => s.openWindow);

  const handleOpenModule = (moduleId: string) => {
    const entry = registry.get(moduleId);
    if (!entry) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dWidth = entry.manifest.window?.defaultWidth ?? 640;
    const dHeight = entry.manifest.window?.defaultHeight ?? 480;

    loader.load(moduleId).catch(() => {});

    const appIdMap: Record<string, string> = {
      'arunaos.files': 'files',
      'arunaos.settings': 'settings',
      'arunaos.astat': 'astat',
      'arunaos.camera': 'camera',
    };

    openWindow({
      id: `module-${moduleId}-${Date.now()}`,
      title: entry.manifest.name,
      icon: entry.manifest.icon,
      appId: appIdMap[moduleId] ?? `module-${moduleId}`,
      position: {
        x: Math.max(20, (viewportWidth - dWidth) / 2 + (Math.random() - 0.5) * 60),
        y: Math.max(20, (viewportHeight - dHeight) / 2 + (Math.random() - 0.5) * 30),
      },
      size: { width: dWidth, height: dHeight },
      zIndex: 1,
      state: 'active',
    });
  };

  return (
    <div className="flex h-full w-full bg-black text-white">
      <InstalledModules store={store} onOpenModule={handleOpenModule} />
    </div>
  );
}
