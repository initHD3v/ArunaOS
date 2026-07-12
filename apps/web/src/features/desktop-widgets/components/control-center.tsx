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
  ChevronRight,
  ChevronDown,
  Droplets,
  Wind,
  Sunrise,
  Sunset,
  Sparkles,
  LayoutPanelLeft,
} from 'lucide-react';
import { useLocationStore } from '@/stores/location.store';
import { useWidgetPanelStore } from '@/features/desktop-widgets/stores/widget-panel.store';

function formatHour(time: string) {
  const d = new Date(time);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(date: string) {
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  return days[new Date(date).getDay()];
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
    if (isMobile) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, isMobile]);

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
            className="text-foreground/30 hover:text-foreground/60 ml-auto text-[10px]"
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

        {/* Widget */}
        <Section label="Widget">
          <WidgetToggle />
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
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[9999]">
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
              className="text-foreground/30 hover:text-foreground/60 text-xs"
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
                <Section label="Widget">
                  <WidgetToggle />
                </Section>
                <Section label="Sistem">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MemoryViewer />
                    </div>
                    <ThemeToggle />
                  </div>
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
        'border-border/30 bg-card/95 overflow-hidden rounded-xl border shadow-xl shadow-black/10 backdrop-blur-2xl transition-all duration-200',
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
        <Loader size={10} className="text-foreground/30 animate-spin" />
        <span className="text-foreground/30 text-[10px]">Memuat cuaca...</span>
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
          className="text-foreground/30 hover:text-foreground/60 ml-auto text-[9px] transition-colors"
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
          <p className="text-foreground/30 truncate text-[9px]">{w.city}</p>
        </div>
        <ChevronRight
          size={10}
          className="text-foreground/20 group-hover:text-foreground/50 transition-colors"
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
    <div className="relative -m-2.5 overflow-hidden rounded-lg">
      {/* Animated Background */}
      <WeatherBackground condition={w.condition} isNight={isNight} />

      {/* Dark overlay — stronger gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/25 to-black/30" />

      {/* Content */}
      <div className="relative z-0 space-y-3 p-3">
        {/* Current + collapse chevron */}
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-0.5 flex items-center gap-1.5">
              <MapPin size={10} className="text-white/60" />
              <span className="text-[10px] text-white/70">{w.city}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-light tabular-nums text-white">{w.temp}°</span>
              <span className="text-xs text-white/70">{w.label}</span>
            </div>
            <p className="text-[10px] text-white/50">Terasa {w.feelsLike}°C</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-3xl">{CONDITION_EMOJI[w.condition]}</span>
            <ChevronDown size={14} className="text-white/40" />
          </div>
        </div>

        {/* Loading indicator */}
        {w.loading && (
          <div className="flex items-center gap-2">
            <Loader size={10} className="animate-spin text-white/50" />
            <span className="text-[9px] text-white/40">Memperbarui...</span>
          </div>
        )}

        {/* AI Summary */}
        {summary && (
          <div className="flex items-start gap-2 rounded-lg bg-white/10 px-3 py-2">
            <Sparkles size={10} className="mt-0.5 shrink-0 text-yellow-300/80" />
            <p className="text-[10px] leading-relaxed text-white/80">{summary}</p>
          </div>
        )}

        {/* 7-hour forecast */}
        {w.hourly.length > 0 && (
          <div>
            <p className="mb-1.5 text-[8px] uppercase tracking-wider text-white/40">
              Prakiraan 7 Jam
            </p>
            <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
              {w.hourly.map((h, i) => {
                const cond = getCondition(h.weatherCode);
                return (
                  <div
                    key={h.time}
                    className={`flex min-w-[48px] flex-col items-center gap-1 rounded-lg px-2 py-1.5 ${
                      i === 0 ? 'bg-white/15 ring-1 ring-white/25' : 'bg-white/8'
                    }`}
                  >
                    <span className="text-[8px] font-medium text-white/60">
                      {i === 0 ? 'Skrg' : formatHour(h.time)}
                    </span>
                    <span className="text-sm">{CONDITION_EMOJI[cond.condition]}</span>
                    <span className="text-[10px] font-medium tabular-nums text-white/90">
                      {h.temp}°
                    </span>
                    {h.precipitation > 0 && (
                      <span className="text-[7px] tabular-nums text-blue-300/80">
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
            <p className="mb-1.5 text-[8px] uppercase tracking-wider text-white/40">
              Prakiraan 7 Hari
            </p>
            <div className="space-y-0.5">
              {w.daily.map((d) => {
                const cond = getCondition(d.weatherCode);
                const isToday = d.date === new Date().toISOString().slice(0, 10);
                return (
                  <div
                    key={d.date}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${
                      isToday ? 'bg-white/12' : 'hover:bg-white/5'
                    }`}
                  >
                    <span className="w-10 text-[9px] font-medium text-white/60">
                      {isToday ? 'Hari ini' : formatDay(d.date)}
                    </span>
                    <span className="text-sm">{CONDITION_EMOJI[cond.condition]}</span>
                    <div className="flex flex-1 items-center gap-2">
                      <span className="text-[10px] font-medium tabular-nums text-white/90">
                        {d.tempMax}°
                      </span>
                      <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/15">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-amber-400"
                          style={{ width: `${Math.max(10, ((d.tempMax - 15) / 25) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums text-white/50">{d.tempMin}°</span>
                    </div>
                    {d.precipitationProb > 0 && (
                      <span className="w-8 text-right text-[8px] tabular-nums text-blue-300/80">
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
          <p className="mb-1.5 text-[8px] uppercase tracking-wider text-white/40">Detail</p>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-white/8 flex items-center gap-2 rounded-lg px-2.5 py-1.5">
              <Droplets size={10} className="shrink-0 text-white/50" />
              <div>
                <p className="text-[7px] uppercase tracking-wider text-white/40">Kelembaban</p>
                <p className="text-[10px] font-medium tabular-nums text-white/85">{w.humidity}%</p>
              </div>
            </div>
            <div className="bg-white/8 flex items-center gap-2 rounded-lg px-2.5 py-1.5">
              <Wind size={10} className="shrink-0 text-white/50" />
              <div>
                <p className="text-[7px] uppercase tracking-wider text-white/40">Angin</p>
                <p className="text-[10px] font-medium tabular-nums text-white/85">
                  {w.windSpeed} km/h
                </p>
              </div>
            </div>
            <div className="bg-white/8 flex items-center gap-2 rounded-lg px-2.5 py-1.5">
              <Sunrise size={10} className="shrink-0 text-white/50" />
              <div>
                <p className="text-[7px] uppercase tracking-wider text-white/40">Terbit</p>
                <p className="text-[10px] font-medium tabular-nums text-white/85">
                  {formatTime(w.sunrise)}
                </p>
              </div>
            </div>
            <div className="bg-white/8 flex items-center gap-2 rounded-lg px-2.5 py-1.5">
              <Sunset size={10} className="shrink-0 text-white/50" />
              <div>
                <p className="text-[7px] uppercase tracking-wider text-white/40">Terbenam</p>
                <p className="text-[10px] font-medium tabular-nums text-white/85">
                  {formatTime(w.sunset)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <p className="mb-1.5 text-[8px] uppercase tracking-wider text-white/40">Saran</p>
            <div className="space-y-1">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className="bg-white/8 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                >
                  <span>{s.icon}</span>
                  <p className="text-[9px] text-white/75">{s.text}</p>
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
      <p className="text-foreground/30 mb-1.5 text-[9px] uppercase tracking-wider">{label}</p>
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
  const { enabled, city, loading, error, toggleEnabled } = useLocationStore();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {enabled ? (
          <MapPin size={10} className="text-primary" />
        ) : (
          <MapPinOff size={10} className="text-foreground/30" />
        )}
        <div>
          <span className="text-foreground/60 text-[10px]">
            {enabled ? (city ?? 'Lokasi aktif') : 'Lokasi nonaktif'}
          </span>
          {error && <p className="text-danger/60 text-[8px]">{error}</p>}
        </div>
      </div>
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
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-white"
          />
        ) : (
          <span
            className={cn(
              'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
              enabled ? 'translate-x-[18px]' : 'translate-x-0.5',
            )}
          />
        )}
      </button>
    </div>
  );
}

function WidgetToggle() {
  const visible = useWidgetPanelStore((s) => s.visible);
  const toggle = useWidgetPanelStore((s) => s.toggle);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <LayoutPanelLeft size={10} className={visible ? 'text-primary' : 'text-foreground/30'} />
        <span className="text-foreground/60 text-[10px]">
          {visible ? 'Widget aktif' : 'Widget disembunyikan'}
        </span>
      </div>
      <button
        onClick={toggle}
        className={cn(
          'relative h-5 w-9 rounded-full transition-colors',
          visible ? 'bg-primary' : 'bg-foreground/20',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
            visible ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </button>
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
