'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useDesktopStore } from '@/features/desktop/stores/desktop.store';

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

export function Wallpaper() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const wallpaperIndex = useDesktopStore((s) => s.wallpaperIndex);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="bg-background fixed inset-0 -z-10" />;
  }

  return (
    <div
      className="fixed inset-0 -z-10"
      style={{ background: generateGradient(theme, wallpaperIndex) }}
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
