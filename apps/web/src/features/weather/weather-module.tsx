'use client';

import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useWeatherStore, getCondition, CONDITION_EMOJI } from './weather.store';
import { WeatherBackground } from './weather-animations';
import { getWeatherSummary, getWeatherSuggestions } from './weather-ai';
import { useLocationStore } from '@/stores/location.store';
import {
  Droplets,
  Wind,
  Sunrise,
  Sunset,
  ChevronLeft,
  Sparkles,
  Loader,
  MapPin,
} from 'lucide-react';

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

export function WeatherModule({ onClose }: { onClose: () => void }) {
  const ls = useLocationStore();
  const store = useWeatherStore();

  useEffect(() => {
    const lat = ls.enabled && ls.latitude != null ? ls.latitude : -6.2088;
    const lon = ls.enabled && ls.longitude != null ? ls.longitude : 106.8456;
    store.fetchWeather(lat, lon, ls.city);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const isNight = isNightTime();
  const hour = new Date().getHours();
  const suggestions = useMemo(
    () => (store.loading ? [] : getWeatherSuggestions(store, hour)),
    [store.loading, store.condition, store.temp, hour],
  );
  const summary = useMemo(
    () => (store.loading ? '' : getWeatherSummary(store)),
    [store.loading, store],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-background/40 fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="border-border bg-background relative flex max-h-[90vh] w-[520px] flex-col overflow-hidden rounded-2xl border shadow-2xl shadow-black/10 backdrop-blur-2xl"
      >
        {/* Background layer — fixed, covers full modal even when content scrolls (fix half-top bug) */}
        {!store.loading && (
          <div className="absolute inset-0 rounded-2xl">
            <WeatherBackground condition={store.condition} isNight={isNight} />
            <div className="bg-background/70 absolute inset-0 rounded-2xl backdrop-blur-[2px]" />
            <div className="from-background/0 via-background/20 to-background/60 absolute inset-0 rounded-2xl bg-gradient-to-b" />
          </div>
        )}

        {/* Loading overlay */}
        <AnimatePresence>
          {store.loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-background/60 absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl backdrop-blur-sm"
            >
              <div className="border-border bg-muted flex flex-col items-center gap-3 rounded-xl border px-8 py-6">
                <Loader size={22} className="text-muted-foreground animate-spin" />
                <span className="text-muted-foreground text-xs">Memuat data cuaca...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content — scrolls over fixed background */}
        <div className="relative z-0 flex-1 space-y-5 overflow-auto p-6">
          {/* Header with back button */}
          <div className="mb-5 flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] transition-colors"
            >
              <ChevronLeft size={12} />
              Kembali
            </button>
            <div className="flex items-center gap-1.5">
              <MapPin size={10} className="text-muted-foreground" />
              <span className="text-muted-foreground text-[10px] font-medium">
                {store.city || 'Memuat...'}
              </span>
            </div>
          </div>

          {/* Error state */}
          {store.error && !store.loading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="bg-muted rounded-full p-3">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="max-w-xs text-center text-[11px] text-red-500/80">{store.error}</p>
              <button
                onClick={() => {
                  const lat = ls.enabled && ls.latitude != null ? ls.latitude : -6.2088;
                  const lon = ls.enabled && ls.longitude != null ? ls.longitude : 106.8456;
                  store.fetchWeather(lat, lon, ls.city);
                }}
                className="bg-muted text-foreground hover:bg-muted/80 rounded-lg px-4 py-1.5 text-[10px] font-medium transition-colors"
              >
                Coba lagi
              </button>
            </div>
          )}

          {/* Weather data */}
          {!store.loading && !store.error && (
            <div className="space-y-5">
              {/* ─── Hero: Current Weather ─── */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-foreground text-6xl font-extralight tabular-nums tracking-tight">
                      {store.temp}°
                    </span>
                    <span className="text-muted-foreground text-base font-medium">
                      {store.label}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">Terasa {store.feelsLike}°C</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-5xl">{CONDITION_EMOJI[store.condition]}</span>
                </div>
              </div>

              {/* ─── AI Summary ─── */}
              {summary && (
                <div className="border-border bg-muted flex items-start gap-2.5 rounded-xl border px-4 py-3">
                  <Sparkles size={12} className="mt-0.5 shrink-0 text-yellow-500/70" />
                  <p className="text-foreground/80 text-[11px] leading-relaxed">{summary}</p>
                </div>
              )}

              {/* ─── 7-Hour Forecast ─── */}
              {store.hourly.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-2.5 text-[9px] font-medium uppercase tracking-widest">
                    Prakiraan 7 Jam
                  </p>
                  <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
                    {store.hourly.map((h, i) => {
                      const cond = getCondition(h.weatherCode);
                      const isNow = i === 0;
                      return (
                        <div
                          key={h.time}
                          className={`flex min-w-[60px] flex-col items-center gap-1.5 rounded-xl px-3.5 py-2.5 transition-colors ${
                            isNow ? 'bg-muted ring-border ring-1' : 'bg-muted/50 hover:bg-muted'
                          }`}
                        >
                          <span
                            className={`text-[9px] font-medium ${isNow ? 'text-foreground' : 'text-muted-foreground'}`}
                          >
                            {isNow ? 'Skrg' : formatHour(h.time)}
                          </span>
                          <span className="text-lg">{CONDITION_EMOJI[cond.condition]}</span>
                          <span className="text-foreground text-xs font-semibold tabular-nums">
                            {h.temp}°
                          </span>
                          {h.precipitation > 0 && (
                            <span className="text-[7px] tabular-nums text-blue-500/70">
                              {h.precipitation}%
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── 7-Day Forecast ─── */}
              {store.daily.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-2.5 text-[9px] font-medium uppercase tracking-widest">
                    Prakiraan 7 Hari
                  </p>
                  <div className="space-y-1">
                    {store.daily.map((d) => {
                      const cond = getCondition(d.weatherCode);
                      const isToday = d.date === todayLocalISO();
                      return (
                        <div
                          key={d.date}
                          className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-colors ${
                            isToday ? 'bg-muted' : 'hover:bg-muted/50'
                          }`}
                        >
                          <span className="text-foreground/70 w-12 text-[10px] font-medium">
                            {isToday ? 'Hari ini' : formatDay(d.date)}
                          </span>
                          <span className="w-6 text-center text-base">
                            {CONDITION_EMOJI[cond.condition]}
                          </span>
                          <div className="flex flex-1 items-center gap-2.5">
                            <span className="text-foreground w-8 text-right text-xs font-semibold tabular-nums">
                              {d.tempMax}°
                            </span>
                            <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-400/80 to-amber-400/80"
                                style={{ width: `${Math.max(8, ((d.tempMax - 10) / 30) * 100)}%` }}
                              />
                            </div>
                            <span className="text-muted-foreground w-8 text-xs tabular-nums">
                              {d.tempMin}°
                            </span>
                          </div>
                          {d.precipitationProb > 0 && (
                            <span className="w-9 text-right text-[9px] tabular-nums text-blue-500/70">
                              {d.precipitationProb}%
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── Detail Grid ─── */}
              <div>
                <p className="text-muted-foreground mb-2.5 text-[9px] font-medium uppercase tracking-widest">
                  Detail Cuaca
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      icon: <Droplets size={13} />,
                      label: 'Kelembaban',
                      value: `${store.humidity}%`,
                    },
                    {
                      icon: <Wind size={13} />,
                      label: 'Kecepatan Angin',
                      value: `${store.windSpeed} km/h`,
                    },
                    {
                      icon: <Sunrise size={13} />,
                      label: 'Matahari Terbit',
                      value: formatTime(store.sunrise),
                    },
                    {
                      icon: <Sunset size={13} />,
                      label: 'Matahari Tenggelam',
                      value: formatTime(store.sunset),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="border-border bg-muted flex items-center gap-3 rounded-xl border px-4 py-3"
                    >
                      <div className="bg-background text-muted-foreground flex h-8 w-8 items-center justify-center rounded-lg">
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[8px] uppercase tracking-wider">
                          {item.label}
                        </p>
                        <p className="text-foreground mt-0.5 text-xs font-semibold tabular-nums">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─── AI Suggestions ─── */}
              {suggestions.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-2.5 text-[9px] font-medium uppercase tracking-widest">
                    Saran Hari Ini
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {suggestions.map((s, i) => (
                      <div
                        key={i}
                        className="border-border bg-muted flex items-center gap-2.5 rounded-xl border px-4 py-2.5"
                      >
                        <span className="text-base">{s.icon}</span>
                        <p className="text-foreground/80 text-[10px] leading-relaxed">{s.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
