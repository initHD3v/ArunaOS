'use client';

import { memo, useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useDesktopStore } from '@/features/desktop/stores/desktop.store';
import { Sun, Moon, Monitor, Keyboard, Info } from 'lucide-react';

type SettingsTab = 'general' | 'appearance' | 'keyboard' | 'about';

const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'General', icon: Info },
  { id: 'appearance', label: 'Appearance', icon: Sun },
  { id: 'keyboard', label: 'Keyboard', icon: Keyboard },
  { id: 'about', label: 'About', icon: Monitor },
];

function GeneralPanel() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-foreground mb-3 text-sm font-semibold">About ArunaOS</h3>
        <div className="bg-muted/30 border-border/20 space-y-2 rounded-xl border p-4">
          <div className="flex justify-between text-sm">
            <span className="text-foreground/50">Version</span>
            <span className="text-foreground">0.2.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/50">Build</span>
            <span className="text-foreground">Phase 2</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/50">Engine</span>
            <span className="text-foreground">Next.js 15 + Zustand</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppearancePanel() {
  const { theme, setTheme } = useTheme();
  const wallpaperIndex = useDesktopStore((s) => s.wallpaperIndex);
  const cycleWallpaper = useDesktopStore((s) => s.cycleWallpaper);

  const wallpapers = ['Default', 'Ocean', 'Sunset', 'Forest'];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-foreground mb-3 text-sm font-semibold">Appearance</h3>
        <div className="bg-muted/30 border-border/20 space-y-4 rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <span className="text-foreground text-sm">Theme</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setTheme('light')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors',
                  theme === 'light'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground/60 hover:text-foreground',
                )}
              >
                <Sun size={14} /> Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors',
                  theme === 'dark'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground/60 hover:text-foreground',
                )}
              >
                <Moon size={14} /> Dark
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-foreground text-sm">Wallpaper</span>
            <button
              onClick={cycleWallpaper}
              className="bg-muted text-foreground/60 hover:text-foreground rounded-lg px-3 py-1.5 text-xs transition-colors"
            >
              {wallpapers[wallpaperIndex] ?? 'Default'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KeyboardPanel() {
  const shortcuts = [
    { keys: 'Ctrl + Tab', action: 'Cycle windows' },
    { keys: 'Ctrl + Shift + Tab', action: 'Cycle windows backward' },
    { keys: 'Ctrl + W', action: 'Close focused window' },
    { keys: 'Ctrl + Q', action: 'Close all windows' },
    { keys: 'Tab', action: 'Navigate desktop icons' },
    { keys: 'Enter', action: 'Open selected icon' },
    { keys: 'Escape', action: 'Close menu / Restore window' },
    { keys: 'Right-click', action: 'Context menu' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-foreground mb-3 text-sm font-semibold">Keyboard Shortcuts</h3>
        <div className="bg-muted/30 border-border/20 rounded-xl border p-4">
          <div className="space-y-1.5">
            {shortcuts.map((s) => (
              <div key={s.keys} className="flex items-center justify-between py-1">
                <span className="text-foreground/50 text-xs">{s.action}</span>
                <kbd className="bg-muted text-foreground/70 border-border/30 rounded-md border px-2 py-0.5 font-mono text-[11px]">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AboutPanel() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-foreground mb-3 text-sm font-semibold">About ArunaOS</h3>
        <div className="bg-muted/30 border-border/20 flex flex-col items-center gap-3 rounded-xl border p-6">
          <div className="from-primary/30 to-primary/10 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br">
            <Monitor size={32} className="text-primary/70" />
          </div>
          <div className="text-center">
            <div className="text-foreground text-lg font-semibold">ArunaOS</div>
            <div className="text-foreground/40 text-xs">Version 0.2.0 — Phase 2</div>
          </div>
          <p className="text-foreground/40 max-w-xs text-center text-xs">
            A web-based desktop environment built with Next.js, React, and Zustand. Designed to feel
            like a real operating system in the browser.
          </p>
        </div>
      </div>
    </div>
  );
}

const panelComponents: Record<SettingsTab, React.ElementType> = {
  general: GeneralPanel,
  appearance: AppearancePanel,
  keyboard: KeyboardPanel,
  about: AboutPanel,
};

export const Settings = memo(function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const Panel = panelComponents[activeTab];

  return (
    <div className="bg-background/40 flex h-full">
      <div className="border-border/20 w-48 shrink-0 overflow-auto border-r p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                activeTab === tab.id
                  ? 'bg-muted text-foreground'
                  : 'text-foreground/60 hover:text-foreground hover:bg-muted/50',
              )}
            >
              <Icon size={16} className="shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-auto p-5">
        <Panel />
      </div>
    </div>
  );
});
