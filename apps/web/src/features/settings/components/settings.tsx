'use client';

import { memo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useService } from '@/providers/service-provider';
import type { ThemeService, SettingsService } from '@arunaos/services';
import { Sun, Moon, Monitor, Keyboard, Info, Lock, AlertCircle, CheckCircle } from 'lucide-react';

type SettingsTab = 'general' | 'appearance' | 'keyboard' | 'security' | 'about';

const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'General', icon: Info },
  { id: 'appearance', label: 'Appearance', icon: Sun },
  { id: 'keyboard', label: 'Keyboard', icon: Keyboard },
  { id: 'security', label: 'Security', icon: Lock },
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
  const themeService = useService<ThemeService>('theme');
  const settingsService = useService<SettingsService>('settings');
  const [currentTheme, setCurrentTheme] = useState(themeService.getMode());
  const [wallpaperIdx, setWallpaperIdx] = useState(() => settingsService.get('wallpaper').index);

  const cycleWallpaper = useCallback(() => {
    const next = (wallpaperIdx + 1) % 4;
    setWallpaperIdx(next);
    settingsService.set('wallpaper', { index: next, blur: 0 });
  }, [wallpaperIdx, settingsService]);

  const setTheme = useCallback(
    async (mode: 'light' | 'dark' | 'system' | 'amoled' | 'high-contrast') => {
      await themeService.setMode(mode);
      setCurrentTheme(mode);
    },
    [themeService],
  );

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
                  currentTheme === 'light'
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
                  currentTheme === 'dark'
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
              {wallpapers[wallpaperIdx] ?? 'Default'}
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

function SecurityPanel() {
  const {
    username,
    setUsername,
    isAuthEnabled,
    enableAuth,
    disableAuth,
    setPassword,
    login,
    lock,
  } = useAuthStore();
  const [localUsername, setLocalUsername] = useState(username);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleEnable = useCallback(async () => {
    if (!localUsername.trim()) {
      setMsg({ type: 'error', text: 'Please enter a username.' });
      return;
    }
    if (!newPassword) {
      setMsg({ type: 'error', text: 'Please set a password.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setUsername(localUsername.trim());
    await setPassword(newPassword);
    enableAuth();
    setMsg({
      type: 'success',
      text: 'Authentication enabled. You will be prompted on next page load.',
    });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }, [localUsername, newPassword, confirmPassword, setUsername, setPassword, enableAuth]);

  const handleDisable = useCallback(async () => {
    if (currentPassword) {
      const ok = await login(currentPassword);
      if (!ok) {
        setMsg({ type: 'error', text: 'Current password is incorrect.' });
        return;
      }
    }
    disableAuth();
    setMsg({ type: 'success', text: 'Authentication disabled.' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }, [currentPassword, login, disableAuth]);

  const handleChangePassword = useCallback(async () => {
    if (!newPassword) {
      setMsg({ type: 'error', text: 'Please enter a new password.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (currentPassword) {
      const ok = await login(currentPassword);
      if (!ok) {
        setMsg({ type: 'error', text: 'Current password is incorrect.' });
        return;
      }
    }
    await setPassword(newPassword);
    setMsg({ type: 'success', text: 'Password changed successfully.' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }, [newPassword, confirmPassword, currentPassword, login, setPassword]);

  const handleLockNow = useCallback(() => {
    lock();
  }, [lock]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-foreground mb-3 text-sm font-semibold">User Account</h3>
        <div className="bg-muted/30 border-border/20 space-y-4 rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <span className="text-foreground text-sm">Username</span>
            <input
              type="text"
              value={localUsername}
              onChange={(e) => setLocalUsername(e.target.value)}
              className="bg-muted border-border/40 focus:border-primary/50 focus:ring-primary/20 w-48 rounded-lg border px-3 py-1.5 text-sm outline-none transition-colors focus:ring-2"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-foreground mb-3 text-sm font-semibold">Authentication</h3>
        <div className="bg-muted/30 border-border/20 space-y-4 rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <span className="text-foreground text-sm">Password Protection</span>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                isAuthEnabled ? 'bg-green-500/15 text-green-400' : 'bg-muted text-foreground/40',
              )}
            >
              {isAuthEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          {!isAuthEnabled ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-foreground/60 text-xs">New Password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-muted border-border/40 focus:border-primary/50 focus:ring-primary/20 w-48 rounded-lg border px-3 py-1.5 text-sm outline-none transition-colors focus:ring-2"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/60 text-xs">Confirm Password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-muted border-border/40 focus:border-primary/50 focus:ring-primary/20 w-48 rounded-lg border px-3 py-1.5 text-sm outline-none transition-colors focus:ring-2"
                />
              </div>
              <button
                onClick={handleEnable}
                className="bg-foreground/10 hover:bg-foreground/15 text-foreground/80 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors"
              >
                Enable Authentication
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-foreground/60 text-xs">Current Password</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-muted border-border/40 focus:border-primary/50 focus:ring-primary/20 w-48 rounded-lg border px-3 py-1.5 text-sm outline-none transition-colors focus:ring-2"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/60 text-xs">New Password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-muted border-border/40 focus:border-primary/50 focus:ring-primary/20 w-48 rounded-lg border px-3 py-1.5 text-sm outline-none transition-colors focus:ring-2"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/60 text-xs">Confirm Password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-muted border-border/40 focus:border-primary/50 focus:ring-primary/20 w-48 rounded-lg border px-3 py-1.5 text-sm outline-none transition-colors focus:ring-2"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleChangePassword}
                  className="bg-foreground/10 hover:bg-foreground/15 text-foreground/80 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors"
                >
                  Change Password
                </button>
                <button
                  onClick={handleDisable}
                  className="rounded-lg bg-red-500/10 px-4 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
                >
                  Disable Authentication
                </button>
                <button
                  onClick={handleLockNow}
                  className="bg-foreground/10 hover:bg-foreground/15 text-foreground/80 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors"
                >
                  Lock Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {msg && (
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs',
            msg.type === 'success'
              ? 'bg-green-500/10 text-green-400'
              : 'bg-red-500/10 text-red-400',
          )}
        >
          {msg.type === 'success' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
          {msg.text}
        </div>
      )}
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
  security: SecurityPanel,
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
