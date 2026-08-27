'use client';

import { useEffect, useMemo } from 'react';
import { useWeatherStore, getCondition, CONDITION_EMOJI } from './weather.store';
import { WeatherBackground } from './weather-animations';
import { getWeatherSummary, getWeatherSuggestions } from './weather-ai';
import { useLocationStore } from '@/stores/location.store';
import { Droplets, Wind, Sunrise, Sunset, Sparkles, Loader, MapPin } from 'lucide-react';

function formatHour(time: string) {
  const d = new Date(time);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

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

export function WeatherApp() {
  const w = useWeatherStore();
  const ls = useLocationStore();

  useEffect(() => {
    const lat = ls.enabled && ls.latitude != null ? ls.latitude : -6.2088;
    const lon = ls.enabled && ls.longitude != null ? ls.longitude : 106.8456;
    if (w.hourly.length === 0) w.fetchWeather(lat, lon, ls.city);
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
      <div className="bg-card flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader size={22} className="text-muted-foreground animate-spin" />
          <span className="text-muted-foreground text-xs">Memuat cuaca...</span>
        </div>
      </div>
    );
  }

  if (w.error) {
    return (
      <div className="bg-card flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-muted rounded-full p-3">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-danger/70 max-w-xs text-xs">{w.error}</p>
          <button
            onClick={() => {
              const lat = ls.enabled && ls.latitude != null ? ls.latitude : -6.2088;
              const lon = ls.enabled && ls.longitude != null ? ls.longitude : 106.8456;
              w.fetchWeather(lat, lon, ls.city);
            }}
            className="bg-muted text-foreground hover:bg-muted/80 rounded-lg px-4 py-1.5 text-[10px] font-medium transition-colors"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card relative h-full w-full overflow-auto">
      <WeatherBackground condition={w.condition} isNight={isNight} />

      {/* Theme-aware overlay — softens background for readability in both themes */}
      <div className="from-background/40 via-background/20 to-background/40 absolute inset-0 bg-gradient-to-b" />

      {/* Content */}
      <div className="relative z-0 space-y-5 p-6">
        {/* Loading indicator */}
        {w.loading && (
          <div className="border-border bg-muted flex items-center gap-2 rounded-xl border px-4 py-2">
            <Loader size={10} className="text-muted-foreground animate-spin" />
            <span className="text-muted-foreground text-[9px]">Memperbarui data...</span>
          </div>
        )}

        {/* ─── Hero Section ─── */}
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <MapPin size={11} className="text-muted-foreground" />
              <span className="text-muted-foreground text-[10px] font-medium">
                {w.city || 'Memuat...'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-foreground text-6xl font-extralight tabular-nums tracking-tight">
                {w.temp}°
              </span>
              <span className="text-muted-foreground text-base font-medium">{w.label}</span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">Terasa {w.feelsLike}°C</p>
          </div>
          <div className="text-5xl">{CONDITION_EMOJI[w.condition]}</div>
        </div>

        {/* ─── AI Summary ─── */}
        {summary && (
          <div className="border-border bg-muted flex items-start gap-2.5 rounded-xl border px-4 py-3">
            <Sparkles size={12} className="mt-0.5 shrink-0 text-yellow-500/70" />
            <p className="text-foreground/80 text-[11px] leading-relaxed">{summary}</p>
          </div>
        )}

        {/* ─── 7-Hour Forecast ─── */}
        {w.hourly.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-2.5 text-[9px] font-medium uppercase tracking-widest">
              Prakiraan 7 Jam
            </p>
            <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
              {w.hourly.map((h, i) => {
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
        {w.daily.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-2.5 text-[9px] font-medium uppercase tracking-widest">
              Prakiraan 7 Hari
            </p>
            <div className="space-y-1">
              {w.daily.map((d) => {
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
              { icon: <Droplets size={13} />, label: 'Kelembaban', value: `${w.humidity}%` },
              { icon: <Wind size={13} />, label: 'Kecepatan Angin', value: `${w.windSpeed} km/h` },
              {
                icon: <Sunrise size={13} />,
                label: 'Matahari Terbit',
                value: formatTime(w.sunrise),
              },
              {
                icon: <Sunset size={13} />,
                label: 'Matahari Tenggelam',
                value: formatTime(w.sunset),
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
    </div>
  );
}
