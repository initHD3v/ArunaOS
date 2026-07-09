'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useService } from '@/providers/service-provider';
import type { ThemeService, SettingsService } from '@arunaos/services';

const WALLPAPERS = [
  '',
  'linear-gradient(135deg, #0f4c81 0%, #001f3f 100%)',
  'linear-gradient(135deg, #ff6b35 0%, #1a0a2e 100%)',
  'linear-gradient(135deg, #2d5016 0%, #0a1a0a 100%)',
];

function generateGradient(theme: string | undefined, index: number) {
  if (index === 0) {
    if (theme === 'dark') {
      return 'radial-gradient(ellipse at top, #1a1a2e 0%, #0a0a0a 100%)';
    }
    return 'radial-gradient(ellipse at top, #e0e7ff 0%, #ffffff 100%)';
  }
  return WALLPAPERS[index];
}

function resolveMode(theme: string, prefersDark: boolean): 'dark' | 'light' {
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  if (theme === 'amoled' || theme === 'high-contrast') return 'dark';
  return prefersDark ? 'dark' : 'light';
}

export function Wallpaper() {
  const themeService = useService<ThemeService>('theme');
  const settingsService = useService<SettingsService>('settings');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="bg-background fixed inset-0 -z-10" />;
  }

  const mode = themeService.getMode();
  const isDark = resolveMode(mode, window.matchMedia('(prefers-color-scheme: dark)').matches);
  const wallpaperIndex = settingsService.get('wallpaper').index;

  return (
    <div
      className="fixed inset-0 -z-10"
      style={{ background: generateGradient(isDark, wallpaperIndex) }}
    >
      <div
        className={cn(
          'absolute inset-0',
          'via-background/5 to-background/40 bg-gradient-to-b from-transparent',
        )}
      />
    </div>
  );
}
