'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-media-query';
import { useAuthStore } from '@/stores/auth.store';
import { useService, useEventBus } from '@/providers/service-provider';
import type { ThemeService, SettingsService, WallpaperConfig } from '@arunaos/services';
import type { ShortcutService } from '@/services/shortcut/shortcut-service';
import { OSTour } from './os-tour';
import { AISettingsPanel } from './ai-settings';
import { DockPanel } from './dock-settings';
import { loadAccount, saveAccount, type AccountData } from './account-data';
import {
  Sun,
  Moon,
  Monitor,
  Keyboard,
  Info,
  Lock,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Upload,
  Camera,
  Image,
  Palette,
  Compass,
  Timer,
  Play,
  PanelBottom,
  User,
  Save,
  HardDrive,
  Cpu,
  Wifi,
  Clock,
  Terminal,
} from 'lucide-react';

type SettingsTab =
  'account' | 'general' | 'appearance' | 'keyboard' | 'security' | 'ai' | 'dock' | 'about';

const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'general', label: 'General', icon: Info },
  { id: 'appearance', label: 'Appearance', icon: Sun },
  { id: 'keyboard', label: 'Keyboard', icon: Keyboard },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'ai', label: 'AI', icon: Sparkles },
  { id: 'dock', label: 'Dock', icon: PanelBottom },
  { id: 'about', label: 'About', icon: Monitor },
];

const AVATAR_EMOJIS = [
  '🧑',
  '👨',
  '👩',
  '🧔',
  '👩‍💻',
  '👨‍💻',
  '🧑‍💻',
  '🐱',
  '🦊',
  '🐶',
  '🐼',
  '🦄',
  '👽',
  '🤖',
  '🎮',
  '🌙',
];

function AccountPanel() {
  const [data, setData] = useState<AccountData>(loadAccount);
  const [saved, setSaved] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = useCallback((partial: Partial<AccountData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleSave = useCallback(() => {
    saveAccount(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [data]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        // Resize to 200px max to fit localStorage quota
        const img = new window.Image();
        img.onload = () => {
          const max = 200;
          let { width, height } = img;
          if (width > height && width > max) {
            height = (height / width) * max;
            width = max;
          } else if (height > max) {
            width = (width / height) * max;
            height = max;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          update({ avatar: canvas.toDataURL('image/jpeg', 0.8) });
          setShowAvatarMenu(false);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [update],
  );

  const isEmoji = data.avatar.length <= 2 && !data.avatar.startsWith('data:');

  return (
    <div className="mx-auto max-w-lg space-y-8 py-4">
      {/* Avatar section */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowAvatarMenu(!showAvatarMenu)}
            className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-2 ring-white/10 transition-all hover:ring-white/30"
          >
            {isEmoji ? (
              <span className="text-5xl">{data.avatar}</span>
            ) : (
              <img src={data.avatar} alt="Avatar" className="h-full w-full object-cover" />
            )}
          </button>
          <div className="bg-primary absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full text-[10px] text-white shadow-sm">
            <Camera size={12} />
          </div>
        </div>

        <div className="text-center">
          <p className="text-foreground text-base font-medium">
            {data.displayName || data.username}
          </p>
          <p className="text-foreground/40 text-xs">Click avatar to change</p>
        </div>

        {/* Avatar menu */}
        <AnimatePresence>
          {showAvatarMenu && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              className="bg-popover border-border/30 w-full rounded-xl border p-3 shadow-lg backdrop-blur-xl"
            >
              <p className="text-foreground/50 mb-2 text-[11px] font-medium uppercase tracking-wider">
                Choose Photo
              </p>
              <div className="flex flex-wrap gap-1.5">
                {AVATAR_EMOJIS.map((a) => (
                  <button
                    key={a}
                    onClick={() => {
                      update({ avatar: a });
                      setShowAvatarMenu(false);
                    }}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all hover:scale-110',
                      data.avatar === a ? 'bg-primary/20 ring-primary/50 ring-2' : 'hover:bg-muted',
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <div className="mt-2 border-t border-white/5 pt-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-foreground/60 hover:text-foreground flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors"
                >
                  <Upload size={12} />
                  Upload from file...
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info fields — macOS style */}
      <div className="bg-muted/30 border-border/20 divide-border/10 divide-y rounded-xl border">
        <div className="flex items-center gap-3 px-5 py-3.5">
          <label className="text-foreground/50 w-24 shrink-0 text-xs font-medium">Full Name</label>
          <input
            type="text"
            value={data.displayName}
            onChange={(e) => update({ displayName: e.target.value })}
            className="bg-background border-border/30 flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none transition-colors focus:border-white/20"
          />
        </div>
        <div className="flex items-center gap-3 px-5 py-3.5">
          <label className="text-foreground/50 w-24 shrink-0 text-xs font-medium">Username</label>
          <input
            type="text"
            value={data.username}
            onChange={(e) => update({ username: e.target.value })}
            className="bg-background border-border/30 flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none transition-colors focus:border-white/20"
          />
        </div>
        <div className="flex items-center gap-3 px-5 py-3.5">
          <label className="text-foreground/50 w-24 shrink-0 text-xs font-medium">Email</label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => update({ email: e.target.value })}
            placeholder="user@arunaos.local"
            className="bg-background border-border/30 flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none transition-colors focus:border-white/20"
          />
        </div>
        <div className="flex items-start gap-3 px-5 py-3.5">
          <label className="text-foreground/50 w-24 shrink-0 pt-1.5 text-xs font-medium">Bio</label>
          <textarea
            value={data.bio}
            onChange={(e) => update({ bio: e.target.value })}
            rows={2}
            placeholder="Tell us about yourself..."
            className="bg-background border-border/30 flex-1 resize-none rounded-lg border px-3 py-1.5 text-sm outline-none transition-colors focus:border-white/20"
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="bg-primary hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-medium text-white transition-all"
        >
          <Save size={14} />
          {saved ? 'Saved!' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}

function GeneralPanel() {
  const [platformLabel, setPlatformLabel] = useState('macOS');
  const [memInfo, setMemInfo] = useState<{ total: string; used: string; percent: number } | null>(
    null,
  );
  const [cpuCores, setCpuCores] = useState<number | null>(null);
  const [connection, setConnection] = useState<string>('Unknown');
  const [startedAt] = useState(() => Date.now());
  const [uptime, setUptime] = useState('');

  useEffect(() => {
    const nav = navigator as Navigator & {
      userAgentData?: {
        getHighEntropyValues: (
          hints: string[],
        ) => Promise<{ platform?: string; architecture?: string }>;
      };
    };
    if (nav.userAgentData) {
      nav.userAgentData
        .getHighEntropyValues(['platform', 'architecture'])
        .then((v) => {
          const parts: string[] = [];
          if (v.platform === 'macOS') parts.push('macOS');
          if (v.architecture === 'arm') parts.push('Apple Silicon');
          else if (v.architecture === 'x86') parts.push('Intel');
          if (parts.length) setPlatformLabel(parts.join(' '));
        })
        .catch(() => {});
    }

    // Memory info
    if ('memory' in navigator) {
      const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
      if (mem) {
        setMemInfo({
          total: `${mem} GB`,
          used: '—',
          percent: 0,
        });
      }
    }

    // CPU cores
    if (navigator.hardwareConcurrency) {
      setCpuCores(navigator.hardwareConcurrency);
    }

    // Connection
    const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
    if (conn?.effectiveType) {
      setConnection(conn.effectiveType.toUpperCase());
    }

    // Uptime ticker
    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      const s = elapsed % 60;
      setUptime(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(tick);
  }, [startedAt]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-foreground mb-3 text-sm font-semibold">System Information</h3>
        <div className="bg-muted/30 border-border/20 space-y-3 rounded-xl border p-4">
          <div className="flex justify-between text-sm">
            <span className="text-foreground/50 flex items-center gap-1.5">
              <Info size={12} /> Version
            </span>
            <span className="text-foreground">0.4.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/50 flex items-center gap-1.5">
              <Terminal size={12} /> Build
            </span>
            <span className="text-foreground">Phase 5 — Desktop & Settings Polish</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/50 flex items-center gap-1.5">
              <Monitor size={12} /> Engine
            </span>
            <span className="text-foreground">Next.js 15 + React 19 + Zustand + Motion</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/50 flex items-center gap-1.5">
              <Cpu size={12} /> Architecture
            </span>
            <span className="text-foreground">Monorepo (Turborepo + pnpm)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/50 flex items-center gap-1.5">
              <Monitor size={12} /> Platform
            </span>
            <span className="text-foreground">{platformLabel}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/50 flex items-center gap-1.5">
              <Cpu size={12} /> CPU Cores
            </span>
            <span className="text-foreground">{cpuCores ?? 'Unknown'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/50 flex items-center gap-1.5">
              <HardDrive size={12} /> Memory
            </span>
            <span className="text-foreground">{memInfo?.total ?? 'Unknown'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/50 flex items-center gap-1.5">
              <Wifi size={12} /> Connection
            </span>
            <span className="text-foreground">{connection}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/50 flex items-center gap-1.5">
              <Clock size={12} /> Uptime
            </span>
            <span className="text-foreground">{uptime}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/50 flex items-center gap-1.5">
              <Terminal size={12} /> Runtime
            </span>
            <span className="text-foreground">
              Module Runtime v1 (Registry, IPC, Sandbox, Lifecycle)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const SOFT_GRADIENTS = [
  { name: 'Soft White', colors: '#f5f7fa → #c3cfe2' },
  { name: 'Ice Blue', colors: '#e0eafc → #cfdef3' },
  { name: 'Blush Pink', colors: '#fce4ec → #f8bbd0' },
  { name: 'Mint Green', colors: '#e8f5e9 → #c8e6c9' },
  { name: 'Warm Honey', colors: '#fff8e1 → #ffecb3' },
  { name: 'Sky Blue', colors: '#e1f5fe → #b3e5fc' },
  { name: 'Lavender', colors: '#f3e5f5 → #e1bee7' },
  { name: 'Teal Mist', colors: '#e0f2f1 → #b2dfdb' },
  { name: 'Peach', colors: '#fbe9e7 → #ffccbc' },
  { name: 'Periwinkle', colors: '#ede7f6 → #d1c4e9' },
];

const DARK_GRADIENTS = [
  { name: 'Midnight', colors: '#1a1a2e → #16213e' },
  { name: 'Deep Purple', colors: '#0f0c29 → #302b63' },
  { name: 'Slate', colors: '#1e1e2e → #2d2d44' },
  { name: 'Obsidian', colors: '#0a0a0f → #1a1a2e' },
  { name: 'Charcoal', colors: '#111827 → #1f2937' },
];

function AppearancePanel() {
  const themeService = useService<ThemeService>('theme');
  const settingsService = useService<SettingsService>('settings');
  const bus = useEventBus();
  const [currentTheme, setCurrentTheme] = useState(themeService.getMode());
  const [wallpaperCfg, setWallpaperCfg] = useState<WallpaperConfig>(() =>
    settingsService.get('wallpaper'),
  );
  const [powerCfg, setPowerCfg] = useState(() => settingsService.get('power'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return bus.on('settings:updated', () => {
      setPowerCfg({ ...settingsService.get('power') });
    });
  }, [bus]);

  const setTheme = useCallback(
    async (mode: 'light' | 'dark' | 'system' | 'amoled' | 'high-contrast') => {
      await themeService.setMode(mode);
      setCurrentTheme(mode);
    },
    [themeService],
  );

  const updateWallpaper = useCallback(
    async (cfg: WallpaperConfig) => {
      setWallpaperCfg(cfg);
      await settingsService.set('wallpaper', cfg);
    },
    [settingsService],
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        updateWallpaper({ type: 'image', gradientIndex: 0, imagePath: dataUrl, blur: 0 });
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [updateWallpaper],
  );

  const isDark =
    currentTheme === 'dark' ||
    currentTheme === 'amoled' ||
    (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const gradients = isDark ? DARK_GRADIENTS : SOFT_GRADIENTS;

  const wallpaperTypes = [
    { id: 'default', label: 'Default', desc: 'ArunaOS signature' },
    { id: 'gradient', label: 'Gradient', desc: 'Soft color blends' },
    { id: 'image', label: 'Image', desc: 'Upload custom' },
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-foreground mb-3 text-sm font-semibold">Appearance</h3>
        <div className="bg-muted/30 border-border/20 space-y-4 rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <span className="text-foreground text-sm">Theme</span>
            <div className="flex gap-1.5">
              {[
                { mode: 'light' as const, icon: Sun, label: 'Light' },
                { mode: 'dark' as const, icon: Moon, label: 'Dark' },
                { mode: 'system' as const, icon: Monitor, label: 'System' },
              ].map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setTheme(mode)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors',
                    currentTheme === mode
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground/60 hover:text-foreground',
                  )}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-foreground mb-3 text-sm font-semibold">Wallpaper</h3>
        <div className="bg-muted/30 border-border/20 space-y-4 rounded-xl border p-4">
          <div className="flex gap-2">
            {wallpaperTypes.map(({ id, label, desc }) => {
              const getCfg = (): WallpaperConfig => {
                if (id === 'default')
                  return { type: 'default', gradientIndex: 0, imagePath: '', blur: 0 };
                if (id === 'gradient')
                  return { type: 'gradient', gradientIndex: 0, imagePath: '', blur: 0 };
                return {
                  type: 'image',
                  gradientIndex: 0,
                  imagePath: wallpaperCfg.imagePath || '',
                  blur: 0,
                };
              };
              return (
                <button
                  key={id}
                  onClick={() => updateWallpaper(getCfg())}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-1 rounded-lg p-3 text-xs transition-colors',
                    wallpaperCfg.type === id
                      ? 'bg-primary/10 text-primary border-primary/30 border'
                      : 'bg-muted text-foreground/60 hover:text-foreground border border-transparent',
                  )}
                >
                  {id === 'default' ? (
                    <Image size={20} />
                  ) : id === 'gradient' ? (
                    <Palette size={20} />
                  ) : (
                    <Upload size={20} />
                  )}
                  <span className="font-medium">{label}</span>
                  <span className="text-foreground/40">{desc}</span>
                </button>
              );
            })}
          </div>

          {wallpaperCfg.type === 'gradient' && (
            <div className="space-y-2">
              <span className="text-foreground/60 text-xs">Gradient Style</span>
              <div className="grid grid-cols-5 gap-2">
                {gradients.map((g, i) => (
                  <button
                    key={i}
                    onClick={() => updateWallpaper({ ...wallpaperCfg, gradientIndex: i })}
                    className={cn(
                      'aspect-video rounded-lg border-2 transition-all',
                      wallpaperCfg.gradientIndex === i
                        ? 'border-primary scale-105'
                        : 'border-transparent hover:scale-105',
                    )}
                    style={{
                      background: isDark
                        ? `linear-gradient(135deg, ${DARK_GRADIENTS[i]!.colors.split(' → ')[0]}, ${DARK_GRADIENTS[i]!.colors.split(' → ')[1]})`
                        : `linear-gradient(135deg, ${SOFT_GRADIENTS[i]!.colors.split(' → ')[0]}, ${SOFT_GRADIENTS[i]!.colors.split(' → ')[1]})`,
                    }}
                    title={g.name}
                  />
                ))}
              </div>
              <div className="text-foreground/40 text-[11px]">
                {gradients[wallpaperCfg.gradientIndex]?.name ?? 'Custom'}
              </div>
            </div>
          )}

          {wallpaperCfg.type === 'image' && (
            <div className="space-y-2">
              <span className="text-foreground/60 text-xs">Custom Image</span>
              {wallpaperCfg.imagePath && (
                <div className="relative mb-2 aspect-video w-full overflow-hidden rounded-lg">
                  <img
                    src={wallpaperCfg.imagePath}
                    alt="Wallpaper preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    onClick={() => updateWallpaper({ ...wallpaperCfg, imagePath: '' })}
                    className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white/80 transition-colors hover:bg-black/70"
                  >
                    <AlertCircle size={12} />
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-muted text-foreground/60 hover:text-foreground flex items-center gap-2 rounded-lg px-4 py-2 text-xs transition-colors"
              >
                <Upload size={14} />
                {wallpaperCfg.imagePath ? 'Change Image' : 'Choose Image'}
              </button>
              <p className="text-foreground/30 text-[11px]">
                Supports: JPG, PNG, GIF, WebP, BMP, SVG
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Power Management */}
      <div>
        <h3 className="text-foreground mb-3 text-sm font-semibold">Power Management</h3>
        <div className="bg-muted/30 border-border/20 space-y-4 rounded-xl border p-4">
          {[
            { key: 'screensaver', label: 'Screen Saver' },
            { key: 'lock', label: 'Auto-Lock' },
            { key: 'sleep', label: 'Sleep' },
          ].map(({ key, label }) => {
            const value = powerCfg?.[key as keyof typeof powerCfg] ?? 0;
            return (
              <div key={key} className="flex items-center justify-between">
                <span className="text-foreground flex items-center gap-2 text-sm">
                  <Timer size={14} className="text-foreground/40" />
                  {label}
                </span>
                <select
                  value={value}
                  onChange={async (e) => {
                    const v = Number(e.target.value);
                    const current = settingsService.get('power');
                    await settingsService.set('power', { ...current, [key]: v });
                    setPowerCfg((prev) => ({ ...prev, [key]: v }));
                  }}
                  className="bg-muted border-border/40 focus:border-primary/50 rounded-lg border px-3 py-1.5 text-xs outline-none transition-colors"
                >
                  <option value={0}>Never</option>
                  <option value={60000}>1 minute</option>
                  <option value={300000}>5 minutes</option>
                  <option value={900000}>15 minutes</option>
                  <option value={1800000}>30 minutes</option>
                  <option value={3600000}>1 hour</option>
                  <option value={7200000}>2 hours</option>
                </select>
              </div>
            );
          })}
          <p className="text-foreground/30 text-[11px] leading-relaxed">
            ArunaOS will show a screen saver, lock, or sleep after the specified period of
            inactivity.
          </p>
          <button
            onClick={() => bus.emit('screensaver:trigger', {})}
            className="bg-muted text-foreground/60 hover:text-foreground hover:bg-muted/60 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors"
          >
            <Play size={12} />
            Test Screen Saver
          </button>
        </div>
      </div>
    </div>
  );
}

function KeyboardPanel() {
  const shortcut = useService<ShortcutService>('shortcut');
  const [shortcuts, setShortcuts] = useState<Array<{ keys: string; action: string; id: string }>>(
    [],
  );

  const formatKey = (s: string): string => {
    const parts = s.split('+').map((p) => p.trim().toLowerCase());
    return parts
      .map((p) => {
        switch (p) {
          case 'meta':
            return '⌘';
          case 'ctrl':
            return '^';
          case 'alt':
            return '⌥';
          case 'shift':
            return '⇧';
          case 'escape':
            return 'Esc';
          case 'tab':
            return 'Tab';
          case 'enter':
            return 'Enter';
          default:
            return p.charAt(0).toUpperCase() + p.slice(1);
        }
      })
      .join('');
  };

  useEffect(() => {
    const registry = shortcut.getRegistry();
    setShortcuts(
      registry.map((entry) => ({
        id: entry.id,
        keys: formatKey(entry.shortcut),
        action: entry.description || entry.id,
      })),
    );
  }, [shortcut]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-foreground mb-3 text-sm font-semibold">Keyboard Shortcuts</h3>
        <div className="bg-muted/30 border-border/20 rounded-xl border p-4">
          <div className="space-y-1.5">
            {shortcuts.length === 0 && (
              <p className="text-foreground/30 text-xs">No shortcuts registered.</p>
            )}
            {shortcuts.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-1">
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
  const [showTour, setShowTour] = useState(false);

  return (
    <>
      <div className="space-y-5">
        <div>
          <h3 className="text-foreground mb-3 text-sm font-semibold">About ArunaOS</h3>
          <div className="bg-muted/30 border-border/20 flex flex-col items-center gap-5 rounded-xl border p-8">
            {/* Logo */}
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-transparent opacity-60 blur-xl" />
              <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-white/5">
                <img src="/logo.png" alt="ArunaOS Logo" className="h-full w-full object-contain" />
              </div>
            </div>

            {/* Info */}
            <div className="text-center">
              <div className="text-foreground text-xl font-semibold tracking-tight">ArunaOS</div>
              <div className="text-foreground/40 mt-0.5 text-xs">Version 0.3.0 — Phase 4</div>
            </div>

            {/* Description */}
            <p className="text-foreground/50 max-w-sm text-center text-xs leading-relaxed">
              A web-based operating environment that puts AI at the center of your workspace. Built
              with Next.js, React, and Zustand. Designed to feel like a real OS in the browser —
              with windows, apps, and an extensible module system.
            </p>

            {/* Divider */}
            <div className="h-px w-16 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Credits */}
            <div className="space-y-1 text-center">
              <p className="text-foreground/30 text-xs">Created by</p>
              <a
                href="https://github.com/initHD3v"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/60 hover:text-foreground/80 text-xs transition-colors"
              >
                INITHD3V
              </a>
            </div>

            {/* OS Tour button */}
            <button
              onClick={() => setShowTour(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/20 transition-all hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-violet-500/30"
            >
              <Compass size={16} />
              Take the OS Tour
            </button>
          </div>
        </div>
      </div>

      {showTour && <OSTour onClose={() => setShowTour(false)} />}
    </>
  );
}

const panelComponents: Record<SettingsTab, React.ElementType> = {
  account: AccountPanel,
  general: GeneralPanel,
  appearance: AppearancePanel,
  keyboard: KeyboardPanel,
  security: SecurityPanel,
  ai: AISettingsPanel,
  dock: DockPanel,
  about: AboutPanel,
};

export const Settings = memo(function Settings() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const Panel = panelComponents[activeTab];

  return (
    <div className="bg-background/40 flex h-full flex-col">
      {isMobile ? (
        <div className="border-border/20 scrollbar-none flex shrink-0 gap-1 overflow-x-auto border-b p-2 pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs transition-colors',
                  isActive
                    ? 'bg-muted text-foreground border-border/30 border-x border-t'
                    : 'text-foreground/60 hover:text-foreground hover:bg-muted/30',
                )}
              >
                <Icon size={14} className="shrink-0" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1">
        {!isMobile ? (
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
        ) : null}
        <div className={cn('min-w-0 flex-1 overflow-auto', isMobile ? 'p-3' : 'p-5')}>
          <Panel />
        </div>
      </div>
    </div>
  );
});
