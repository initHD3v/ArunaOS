'use client';

import dynamic from 'next/dynamic';
import { useService } from '@/providers/service-provider';
import type { ModuleLoader } from '@arunaos/runtime';

const Finder = dynamic(
  () => import('@/features/files/components/finder').then((m) => ({ default: m.Finder })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-white/40">
        Loading module...
      </div>
    ),
  },
);

const MODULE_COMPONENTS: Record<string, React.ComponentType> = {
  'arunaos.files': Finder,
};

interface ModuleRendererProps {
  moduleId: string;
  appData?: Record<string, unknown>;
}

export function ModuleRenderer({ moduleId, appData: _appData }: ModuleRendererProps) {
  const loader = useService<ModuleLoader>('moduleLoader');

  // Ensure module is loaded
  if (!loader.isLoaded(moduleId)) {
    loader.load(moduleId).catch(() => {});
  }

  const Component = MODULE_COMPONENTS[moduleId];
  if (!Component) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-white/40">
        <span className="text-4xl">⬜</span>
        <p className="text-sm">Module &quot;{moduleId}&quot; has no UI component</p>
      </div>
    );
  }

  return <Component />;
}
