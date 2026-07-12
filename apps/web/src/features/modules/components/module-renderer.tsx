'use client';

import dynamic from 'next/dynamic';
import { useService } from '@/providers/service-provider';
import type { ModuleLoader } from '@arunaos/runtime';

const loading = () => (
  <div className="flex h-full items-center justify-center text-sm text-white/40">
    Loading module...
  </div>
);

const Finder = dynamic(
  () => import('@modules/arunaos.files/components/finder').then((m) => ({ default: m.Finder })),
  { ssr: false, loading },
);
const Settings = dynamic(
  () => import('@/features/settings/components/settings').then((m) => ({ default: m.Settings })),
  { ssr: false, loading },
);
const AStat = dynamic(
  () => import('@modules/arunaos.astat/components/astat').then((m) => ({ default: m.AStat })),
  { ssr: false, loading },
);
const CameraApp = dynamic(
  () => import('@modules/arunaos.camera/components/camera').then((m) => ({ default: m.CameraApp })),
  { ssr: false, loading },
);
const AIChat = dynamic(
  () => import('@modules/arunaos.ai/components/ai-chat').then((m) => ({ default: m.AIChat })),
  { ssr: false, loading },
);
const ModuleDevtools = dynamic(
  () =>
    import('@/features/module-devtools/module-devtools').then((m) => ({
      default: m.ModuleDevtools,
    })),
  { ssr: false, loading },
);
const ModuleInstaller = dynamic(
  () =>
    import('@/features/module-installer/module-installer').then((m) => ({
      default: m.ModuleInstaller,
    })),
  { ssr: false, loading },
);
const AppStore = dynamic(
  () =>
    import('@/features/appstore/components/appstore').then((m) => ({
      default: m.AppStore,
    })),
  { ssr: false, loading },
);
const Applications = dynamic(
  () =>
    import('@/features/applications/applications').then((m) => ({
      default: m.Applications,
    })),
  { ssr: false, loading },
);
const WeatherApp = dynamic(
  () =>
    import('@/features/weather/weather-app').then((m) => ({
      default: m.WeatherApp,
    })),
  { ssr: false, loading },
);

const MODULE_COMPONENTS: Record<string, React.ComponentType> = {
  'arunaos.files': Finder,
  'arunaos.settings': Settings,
  'arunaos.astat': AStat,
  'arunaos.camera': CameraApp,
  'arunaos.ai': AIChat,
  'arunaos.devtools': ModuleDevtools,
  'arunaos.installer': ModuleInstaller,
  'arunaos.appstore': AppStore,
  'arunaos.applications': Applications,
  'arunaos.weather': WeatherApp,
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
