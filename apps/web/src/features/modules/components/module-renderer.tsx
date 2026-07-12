'use client';

import { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useService } from '@/providers/service-provider';
import { SandboxV2, ExternalModuleLoader } from '@arunaos/runtime';
import type {
  ModuleLoader,
  SystemAPI,
  ModuleRegistry,
  ExternalModuleManifest,
} from '@arunaos/runtime';

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

function ExternalModuleSandbox({ moduleId }: { moduleId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sandboxRef = useRef<SandboxV2 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const externalLoader = useService<ExternalModuleLoader>('externalModuleLoader');
  const moduleRegistry = useService<ModuleRegistry>('moduleRegistry');
  const systemAPI = useService<SystemAPI>('systemAPI');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    (async () => {
      try {
        const entry = moduleRegistry.get(moduleId);
        if (!entry) throw new Error(`Module '${moduleId}' not registered`);

        const extManifest = entry.manifest as ExternalModuleManifest;
        const bundleCode = await externalLoader.loadFromCache(moduleId);

        if (cancelled) return;

        const sandbox = new SandboxV2({
          manifest: extManifest,
          systemAPI,
          bundleCode,
        });

        sandbox.mount(container);
        sandboxRef.current = sandbox;

        sandbox.callLifecycle('mount', { moduleId });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();

    return () => {
      cancelled = true;
      sandboxRef.current?.unmount();
      sandboxRef.current = null;
    };
  }, [moduleId, moduleRegistry, externalLoader, systemAPI]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-white/40">
        <span className="text-3xl">⚠️</span>
        <p className="text-sm text-red-400">Module error: {error}</p>
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}

export function ModuleRenderer({ moduleId, appData: _appData }: ModuleRendererProps) {
  const loader = useService<ModuleLoader>('moduleLoader');
  const Component = MODULE_COMPONENTS[moduleId];

  // Ensure module is loaded
  if (!loader.isLoaded(moduleId)) {
    loader.load(moduleId).catch(() => {});
  }

  if (Component) return <Component />;

  return <ExternalModuleSandbox moduleId={moduleId} />;
}
