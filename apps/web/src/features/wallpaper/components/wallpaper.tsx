'use client';

import { useEffect, useState } from 'react';
import { useService, useEventBus } from '@/providers/service-provider';
import type { ThemeService, SettingsService, WallpaperConfig, ThemeMode } from '@arunaos/services';

const SOFT_GRADIENTS = [
  'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)',
  'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)',
  'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
  'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)',
  'linear-gradient(135deg, #e1f5fe 0%, #b3e5fc 100%)',
  'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
  'linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)',
  'linear-gradient(135deg, #fbe9e7 0%, #ffccbc 100%)',
  'linear-gradient(135deg, #ede7f6 0%, #d1c4e9 100%)',
];

const DARK_GRADIENTS = [
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  'linear-gradient(135deg, #0f0c29 0%, #302b63 100%)',
  'linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%)',
  'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
  'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
];

function getGradient(index: number, isDark: boolean): string {
  if (isDark) {
    return DARK_GRADIENTS[index % DARK_GRADIENTS.length]!;
  }
  return SOFT_GRADIENTS[index % SOFT_GRADIENTS.length]!;
}

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'dark' || mode === 'amoled') return 'dark';
  if (mode === 'light' || mode === 'high-contrast') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function Wallpaper() {
  const themeService = useService<ThemeService>('theme');
  const settingsService = useService<SettingsService>('settings');
  const bus = useEventBus();
  const [mounted, setMounted] = useState(false);
  const [wallpaperConfig, setWallpaperConfig] = useState<WallpaperConfig>(() =>
    settingsService.get('wallpaper'),
  );
  const [theme, setTheme] = useState<ThemeMode>(() => themeService.getMode());
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const unsub1 = bus.on('theme:changed', ({ mode }: { mode: ThemeMode }) => {
      setTheme(mode);
    });
    const unsub2 = bus.on('settings:updated', (payload: { key?: string }) => {
      if (payload.key === 'wallpaper') {
        const cfg = settingsService.get('wallpaper');
        setWallpaperConfig(cfg);
        setImageError(false);
      }
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, [bus, settingsService]);

  if (!mounted) {
    return <div className="bg-background fixed inset-0 -z-10" />;
  }

  const isDark = resolveTheme(theme);
  const cfg = wallpaperConfig;

  let backgroundStyle: React.CSSProperties;

  if (cfg.type === 'image' && cfg.imagePath && !imageError) {
    backgroundStyle = {
      backgroundImage: `url(${cfg.imagePath})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  } else if (cfg.type === 'default') {
    backgroundStyle = {
      backgroundImage: 'url(/wallpapers/default.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  } else {
    backgroundStyle = {
      background: getGradient(cfg.gradientIndex, isDark === 'dark'),
    };
  }

  return (
    <div className="fixed inset-0 -z-10" style={backgroundStyle}>
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: isDark === 'dark' ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.02)',
        }}
      />
    </div>
  );
}
