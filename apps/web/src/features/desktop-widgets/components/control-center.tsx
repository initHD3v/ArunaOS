'use client';

import { useEffect, useState, useRef, useMemo } from 'react';

import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-media-query';
import { useWeatherStore, CONDITION_EMOJI, getCondition } from '@/features/weather/weather.store';
import type { WeatherState, WeatherActions } from '@/features/weather/weather.store';
import { WeatherBackground } from '@/features/weather/weather-animations';
import { getWeatherSummary, getWeatherSuggestions } from '@/features/weather/weather-ai';
import { MoodTracker } from './mood-tracker';
import { TaskSummary } from './task-summary';
import { EngineStatus } from '@/features/engine/components/engine-status';
import { MemoryViewer } from '@/features/engine/components/memory-viewer';
import { useService, useEventBus } from '@/providers/service-provider';
import type { ThemeService, ThemeMode } from '@arunaos/services';
import {
  Sun,
  Moon,
  Sliders,
  MapPin,
  MapPinOff,
  Loader,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Droplets,
  Wind,
  Sunrise,
  Sunset,
  Sparkles,
  Search,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useLocationStore } from '@/stores/location.store';
import { useMobileShortcutStore } from '@/features/mobile-shortcuts/mobile-shortcut-store';

function formatHour(time: string) {
  const d = new Date(time);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// B11: Open-Meteo dates are date-only ("YYYY-MM-DD"); new Date(str) parses
// them as UTC midnight, which shifts weekday labels one day back in
// negative-UTC-offset timezones. Parse explicitly as local dates instead.
function parseLocalDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function todayLocalISO(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

function formatDay(date: string) {
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  return days[parseLocalDate(date).getDay()];
}

function formatTime(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function isNightTime(): boolean {
  const h = new Date().getHours();
  return h < 4 || h >= 19;
}

export function ControlCenterPopup({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [weatherExpanded, setWeatherExpanded] = useState(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function toggleWeather(e: React.MouseEvent) {
    e.stopPropagation();
    setWeatherExpanded((v) => !v);
  }

  const content = (
    <>
      {/* Header */}
      <div className="border-border/20 flex shrink-0 items-center gap-2 border-b px-3 py-2.5">
        <Sliders size={12} className="text-foreground/40" />
        <span className="text-foreground/70 text-[11px] font-medium">Control Center</span>
        {isMobile && (
          <button
            onClick={onClose}
            className="text-foreground/50 hover:text-foreground/60 ml-auto text-[10px]"
          >
            Tutup
          </button>
        )}
        {!isMobile && (
          <div className="ml-auto">
            <EngineStatus />
          </div>
        )}
      </div>

      {/* Content */}
      <div
        className={isMobile ? 'space-y-4 p-4 pb-8' : 'max-h-[80vh] space-y-3 overflow-y-auto p-3'}
      >
        {/* Weather — clickable to expand */}
        <Section label="Cuaca" onClick={toggleWeather}>
          <WeatherSection expanded={weatherExpanded} />
        </Section>

        {/* Mood */}
        <Section label="Suasana Hati">
          <MoodTracker />
        </Section>

        {/* Tasks */}
        <Section label="Tugas">
          <TaskSummary />
        </Section>

        {/* Location */}
        <Section label="Lokasi">
          <LocationToggle />
        </Section>

        {/* System */}
        <Section label="Sistem">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MemoryViewer />
            </div>
            <ThemeToggle />
          </div>
        </Section>

        {/* Mobile */}
        <Section label="Mobile">
          <MobileShortcutsControl />
        </Section>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div ref={ref} className="fixed inset-0 z-[9999]">
        <div className="bg-background/95 flex h-full flex-col backdrop-blur-2xl">
          <div
            className="flex shrink-0 items-center justify-between border-b px-4 py-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-foreground/40" />
              <span className="text-foreground/70 text-xs font-medium">Control Center</span>
            </div>
            <button
              onClick={onClose}
              className="text-foreground/50 hover:text-foreground/60 text-xs"
            >
              Tutup
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4">
              <div className="mx-auto max-w-lg space-y-4">
                <Section label="Cuaca" onClick={toggleWeather}>
                  <WeatherSection expanded={weatherExpanded} />
                </Section>
                <Section label="Suasana Hati">
                  <MoodTracker />
                </Section>
                <Section label="Tugas">
                  <TaskSummary />
                </Section>
                <Section label="Lokasi">
                  <LocationToggle />
                </Section>
                <Section label="Sistem">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MemoryViewer />
                    </div>
                    <ThemeToggle />
                  </div>
                </Section>
                <Section label="Mobile">
                  <MobileShortcutsControl />
                </Section>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        'border-border/30 bg-card/80 shadow-foreground/10 overflow-hidden rounded-xl border shadow-xl backdrop-blur-2xl transition-all duration-200',
        weatherExpanded ? 'w-[460px]' : 'w-72',
      )}
    >
      {content}
    </div>
  );
}

/* ─── W e a t h e r   S e c t i o n   ─── */
function WeatherSection({ expanded }: { expanded: boolean }) {
  const w = useWeatherStore();
  const ls = useLocationStore();

  useEffect(() => {
    if (!w.loading && w.hourly.length === 0) {
      const lat = ls.enabled && ls.latitude != null ? ls.latitude : -6.2088;
      const lon = ls.enabled && ls.longitude != null ? ls.longitude : 106.8456;
      w.fetchWeather(lat, lon, ls.city);
    }
  }, []);

  const isNight = isNightTime();
  const hour = new Date().getHours();
  const suggestions = useMemo(
    () => (w.loading ? [] : getWeatherSuggestions(w, hour)),
    [w.loading, w.condition, w.temp, hour],
  );
  const summary = useMemo(() => (w.loading ? '' : getWeatherSummary(w)), [w.loading, w]);

  if (w.loading && w.hourly.length === 0) {
    return (
      <div className="flex h-6 items-center gap-2">
        <Loader size={10} className="text-foreground/50 animate-spin" />
        <span className="text-foreground/50 text-[10px]">Memuat cuaca...</span>
      </div>
    );
  }

  if (w.error && w.hourly.length === 0) {
    const lat = ls.enabled && ls.latitude != null ? ls.latitude : -6.2088;
    const lon = ls.enabled && ls.longitude != null ? ls.longitude : 106.8456;
    return (
      <div className="flex h-6 items-center gap-2">
        <span className="text-danger/50 text-[10px]">{w.error}</span>
        <button
          onClick={() => w.fetchWeather(lat, lon, ls.city)}
          className="text-foreground/50 hover:text-foreground/60 ml-auto text-[9px] transition-colors"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (!expanded) {
    return (
      <div className="group flex cursor-pointer items-center gap-3">
        <span className="text-xl">{CONDITION_EMOJI[w.condition]}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-foreground text-base font-light tabular-nums">{w.temp}°</span>
            <span className="text-foreground/40 truncate text-[9px]">{w.label}</span>
          </div>
          <p className="text-foreground/50 truncate text-[9px]">{w.city}</p>
        </div>
        <ChevronRight
          size={10}
          className="text-foreground/40 group-hover:text-foreground/50 transition-colors"
        />
      </div>
    );
  }

  return (
    <WeatherExpandedView w={w} isNight={isNight} summary={summary} suggestions={suggestions} />
  );
}

/* ─── E x p a n d e d   W e a t h e r   V i e w   ─── */
function WeatherExpandedView({
  w,
  isNight,
  summary,
  suggestions,
}: {
  w: WeatherState & WeatherActions;
  isNight: boolean;
  summary: string;
  suggestions: { icon: string; text: string }[];
}) {
  return (
    <div className="border-border/20 relative -m-2.5 overflow-hidden rounded-lg border">
      {/* Animated Background */}
      <WeatherBackground condition={w.condition} isNight={isNight} />

      {/* Theme-aware overlay — adapts to --background/--foreground */}
      <div className="from-card/50 via-background/30 to-card/60 absolute inset-0 bg-gradient-to-b backdrop-blur-[1px]" />

      {/* Content */}
      <div className="relative z-0 space-y-3 p-3">
        {/* Current + collapse chevron */}
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-0.5 flex items-center gap-1.5">
              <MapPin size={10} className="text-foreground/60" />
              <span className="text-foreground/70 text-[10px]">{w.city}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-foreground text-4xl font-light tabular-nums">{w.temp}°</span>
              <span className="text-foreground/70 text-xs">{w.label}</span>
            </div>
            <p className="text-foreground/50 text-[10px]">Terasa {w.feelsLike}°C</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-3xl">{CONDITION_EMOJI[w.condition]}</span>
            <ChevronDown size={14} className="text-foreground/40" />
          </div>
        </div>

        {/* Loading indicator */}
        {w.loading && (
          <div className="flex items-center gap-2">
            <Loader size={10} className="text-foreground/50 animate-spin" />
            <span className="text-foreground/40 text-[9px]">Memperbarui...</span>
          </div>
        )}

        {/* AI Summary */}
        {summary && (
          <div className="border-border/20 bg-card/60 flex items-start gap-2 rounded-lg border px-3 py-2 backdrop-blur-sm">
            <Sparkles size={10} className="mt-0.5 shrink-0 text-yellow-500/80" />
            <p className="text-foreground/80 text-[10px] leading-relaxed">{summary}</p>
          </div>
        )}

        {/* 7-hour forecast */}
        {w.hourly.length > 0 && (
          <div>
            <p className="text-foreground/40 mb-1.5 text-[8px] uppercase tracking-wider">
              Prakiraan 7 Jam
            </p>
            <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
              {w.hourly.map((h, i) => {
                const cond = getCondition(h.weatherCode);
                return (
                  <div
                    key={h.time}
                    className={`flex min-w-[48px] flex-col items-center gap-1 rounded-lg border px-2 py-1.5 backdrop-blur-sm ${
                      i === 0
                        ? 'border-border/30 bg-card/80 ring-border/30 ring-1'
                        : 'border-border/20 bg-muted/40'
                    }`}
                  >
                    <span className="text-foreground/60 text-[8px] font-medium">
                      {i === 0 ? 'Skrg' : formatHour(h.time)}
                    </span>
                    <span className="text-sm">{CONDITION_EMOJI[cond.condition]}</span>
                    <span className="text-foreground/90 text-[10px] font-medium tabular-nums">
                      {h.temp}°
                    </span>
                    {h.precipitation > 0 && (
                      <span className="text-[7px] tabular-nums text-blue-500/80">
                        {h.precipitation}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 7-day forecast */}
        {w.daily.length > 0 && (
          <div>
            <p className="text-foreground/40 mb-1.5 text-[8px] uppercase tracking-wider">
              Prakiraan 7 Hari
            </p>
            <div className="space-y-0.5">
              {w.daily.map((d) => {
                const cond = getCondition(d.weatherCode);
                const isToday = d.date === todayLocalISO();
                return (
                  <div
                    key={d.date}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 backdrop-blur-sm ${
                      isToday
                        ? 'border-border/30 bg-card/60'
                        : 'hover:bg-muted/40 border-transparent'
                    }`}
                  >
                    <span className="text-foreground/60 w-10 text-[9px] font-medium">
                      {isToday ? 'Hari ini' : formatDay(d.date)}
                    </span>
                    <span className="text-sm">{CONDITION_EMOJI[cond.condition]}</span>
                    <div className="flex flex-1 items-center gap-2">
                      <span className="text-foreground/90 text-[10px] font-medium tabular-nums">
                        {d.tempMax}°
                      </span>
                      <div className="bg-muted h-[3px] flex-1 overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-amber-400"
                          style={{ width: `${Math.max(10, ((d.tempMax - 15) / 25) * 100)}%` }}
                        />
                      </div>
                      <span className="text-foreground/50 text-[10px] tabular-nums">
                        {d.tempMin}°
                      </span>
                    </div>
                    {d.precipitationProb > 0 && (
                      <span className="w-8 text-right text-[8px] tabular-nums text-blue-500/80">
                        {d.precipitationProb}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Details grid */}
        <div>
          <p className="text-foreground/40 mb-1.5 text-[8px] uppercase tracking-wider">Detail</p>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="border-border/20 bg-muted/50 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 backdrop-blur-sm">
              <Droplets size={10} className="text-foreground/50 shrink-0" />
              <div>
                <p className="text-foreground/40 text-[7px] uppercase tracking-wider">Kelembaban</p>
                <p className="text-foreground/80 text-[10px] font-medium tabular-nums">
                  {w.humidity}%
                </p>
              </div>
            </div>
            <div className="border-border/20 bg-muted/50 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 backdrop-blur-sm">
              <Wind size={10} className="text-foreground/50 shrink-0" />
              <div>
                <p className="text-foreground/40 text-[7px] uppercase tracking-wider">Angin</p>
                <p className="text-foreground/80 text-[10px] font-medium tabular-nums">
                  {w.windSpeed} km/h
                </p>
              </div>
            </div>
            <div className="border-border/20 bg-muted/50 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 backdrop-blur-sm">
              <Sunrise size={10} className="text-foreground/50 shrink-0" />
              <div>
                <p className="text-foreground/40 text-[7px] uppercase tracking-wider">Terbit</p>
                <p className="text-foreground/80 text-[10px] font-medium tabular-nums">
                  {formatTime(w.sunrise)}
                </p>
              </div>
            </div>
            <div className="border-border/20 bg-muted/50 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 backdrop-blur-sm">
              <Sunset size={10} className="text-foreground/50 shrink-0" />
              <div>
                <p className="text-foreground/40 text-[7px] uppercase tracking-wider">Terbenam</p>
                <p className="text-foreground/80 text-[10px] font-medium tabular-nums">
                  {formatTime(w.sunset)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <p className="text-foreground/40 mb-1.5 text-[8px] uppercase tracking-wider">Saran</p>
            <div className="space-y-1">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className="border-border/20 bg-muted/50 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 backdrop-blur-sm"
                >
                  <span>{s.icon}</span>
                  <p className="text-foreground/70 text-[9px]">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <div>
      <p className="text-foreground/50 mb-1.5 text-[9px] uppercase tracking-wider">{label}</p>
      <div
        className={cn(
          'border-border/20 bg-background/40 rounded-lg border p-2.5',
          onClick && 'hover:bg-background/60 cursor-pointer transition-colors',
        )}
        onClick={onClick}
      >
        {children}
      </div>
    </div>
  );
}

function LocationToggle() {
  const { enabled, city, loading, error, toggleEnabled, refreshLocation } = useLocationStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshLocation();
    setRefreshing(false);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {enabled ? (
          <MapPin size={10} className="text-primary" />
        ) : (
          <MapPinOff size={10} className="text-foreground/50" />
        )}
        <div>
          <span className="text-foreground/60 text-[10px]">
            {enabled ? (city ?? 'Lokasi aktif') : 'Lokasi nonaktif'}
          </span>
          {error && <p className="text-danger/60 text-[8px]">{error}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {enabled && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-foreground/50 hover:text-foreground rounded p-1 transition-colors disabled:opacity-40"
            title="Perbarui lokasi"
          >
            <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
          </button>
        )}
        <button
          onClick={toggleEnabled}
          disabled={loading}
          className={cn(
            'relative h-5 w-9 rounded-full transition-colors',
            enabled ? 'bg-primary' : 'bg-foreground/20',
            loading && 'opacity-50',
          )}
        >
          {loading ? (
            <Loader
              size={8}
              className="text-primary-foreground absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin"
            />
          ) : (
            <span
              className={cn(
                'bg-background absolute top-0.5 h-4 w-4 rounded-full shadow-sm transition-transform',
                enabled ? 'translate-x-[18px]' : 'translate-x-0.5',
              )}
            />
          )}
        </button>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const themeService = useService<ThemeService>('theme');
  const bus = useEventBus();
  const [currentMode, setCurrentMode] = useState<ThemeMode>(themeService.getMode());

  useEffect(() => {
    const unsub = bus.on('theme:changed', ({ mode }: { mode: ThemeMode }) => {
      setCurrentMode(mode);
    });
    return unsub;
  }, [bus]);

  const isDark =
    currentMode === 'dark' ||
    currentMode === 'amoled' ||
    (currentMode === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <button
      onClick={() => themeService.setMode(isDark ? 'light' : 'dark')}
      className="text-foreground/40 hover:text-foreground/70 hover:bg-muted flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] transition-colors"
    >
      {isDark ? <Sun size={10} /> : <Moon size={10} />}
      {isDark ? 'Terang' : 'Gelap'}
    </button>
  );
}

function MobileShortcutsControl() {
  const isMobile = useIsMobile();
  const visible = useMobileShortcutStore((s) => s.visible);
  const toggle = useMobileShortcutStore((s) => s.toggle);

  const openSpotlight = () => {
    const btn = document.querySelector<HTMLButtonElement>('[data-command-palette-trigger]');
    if (btn) btn.click();
    else
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
      );
  };
  const openAI = () => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'i',
        code: 'KeyI',
        metaKey: true,
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
  };

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showMenu) return;
    const h = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h as EventListener);
    return () => {
      document.removeEventListener('mousedown', h);
      document.removeEventListener('touchstart', h as EventListener);
    };
  }, [showMenu]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs">Shortcut Bar</span>
        <button
          onClick={toggle}
          className={
            visible
              ? 'bg-primary text-primary-foreground flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium'
              : 'bg-muted text-foreground/60 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium'
          }
        >
          {visible ? <Eye size={10} /> : <EyeOff size={10} />}
          {visible ? 'Tampil' : 'Sembunyi'}
        </button>
      </div>
      {!isMobile && <p className="text-foreground/40 text-[10px]">Hanya terlihat di mobile</p>}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="border-border/20 bg-muted hover:bg-muted/80 flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium"
        >
          <Search size={12} /> Search
        </button>
        {showMenu && (
          <div className="border-border/20 bg-card absolute bottom-full left-0 right-0 z-10 mb-2 flex flex-col gap-1 rounded-xl border p-1.5 shadow-xl">
            <button
              onClick={() => {
                setShowMenu(false);
                openSpotlight();
              }}
              className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-black"
            >
              <Search size={12} /> Spotlight
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                openAI();
              }}
              className="flex items-center gap-2 rounded-lg bg-violet-500 px-3 py-2 text-xs font-medium text-white"
            >
              <Sparkles size={12} /> AI Command
            </button>
          </div>
        )}
      </div>
      <p className="text-foreground/30 text-[10px]">Spotlight: ⌘K • AI: ⌘⇧I</p>
    </div>
  );
}
