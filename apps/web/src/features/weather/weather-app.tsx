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
          <Loader size={22} className="text-foreground/30 animate-spin" />
          <span className="text-foreground/40 text-xs">Memuat cuaca...</span>
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
            className="bg-muted text-foreground/60 hover:text-foreground/80 rounded-lg px-4 py-1.5 text-[10px] font-medium transition-colors"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-auto">
      <WeatherBackground condition={w.condition} isNight={isNight} />

      {/* Dark overlay — stronger gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/25 to-black/30" />

      {/* Content */}
      <div className="relative z-0 space-y-5 p-6">
        {/* Loading indicator */}
        {w.loading && (
          <div className="bg-white/8 flex items-center gap-2 rounded-xl border border-white/5 px-4 py-2">
            <Loader size={10} className="animate-spin text-white/50" />
            <span className="text-[9px] text-white/50">Memperbarui data...</span>
          </div>
        )}

        {/* ─── Hero Section ─── */}
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <MapPin size={11} className="text-white/40" />
              <span className="text-[10px] font-medium text-white/50">{w.city || 'Memuat...'}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-extralight tabular-nums tracking-tight text-white">
                {w.temp}°
              </span>
              <span className="text-base font-medium text-white/70">{w.label}</span>
            </div>
            <p className="mt-1 text-xs text-white/40">Terasa {w.feelsLike}°C</p>
          </div>
          <div className="text-5xl">{CONDITION_EMOJI[w.condition]}</div>
        </div>

        {/* ─── AI Summary ─── */}
        {summary && (
          <div className="bg-white/8 flex items-start gap-2.5 rounded-xl border border-white/5 px-4 py-3">
            <Sparkles size={12} className="mt-0.5 shrink-0 text-yellow-300/70" />
            <p className="text-[11px] leading-relaxed text-white/85">{summary}</p>
          </div>
        )}

        {/* ─── 7-Hour Forecast ─── */}
        {w.hourly.length > 0 && (
          <div>
            <p className="mb-2.5 text-[9px] font-medium uppercase tracking-widest text-white/40">
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
                      isNow ? 'bg-white/15 ring-1 ring-white/25' : 'bg-white/6 hover:bg-white/10'
                    }`}
                  >
                    <span
                      className={`text-[9px] font-medium ${isNow ? 'text-white/90' : 'text-white/50'}`}
                    >
                      {isNow ? 'Skrg' : formatHour(h.time)}
                    </span>
                    <span className="text-lg">{CONDITION_EMOJI[cond.condition]}</span>
                    <span className="text-xs font-semibold tabular-nums text-white/90">
                      {h.temp}°
                    </span>
                    {h.precipitation > 0 && (
                      <span className="text-[7px] tabular-nums text-blue-300/70">
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
            <p className="mb-2.5 text-[9px] font-medium uppercase tracking-widest text-white/40">
              Prakiraan 7 Hari
            </p>
            <div className="space-y-1">
              {w.daily.map((d) => {
                const cond = getCondition(d.weatherCode);
                const isToday = d.date === new Date().toISOString().slice(0, 10);
                return (
                  <div
                    key={d.date}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-colors ${
                      isToday ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <span className="w-12 text-[10px] font-medium text-white/70">
                      {isToday ? 'Hari ini' : formatDay(d.date)}
                    </span>
                    <span className="w-6 text-center text-base">
                      {CONDITION_EMOJI[cond.condition]}
                    </span>
                    <div className="flex flex-1 items-center gap-2.5">
                      <span className="w-8 text-right text-xs font-semibold tabular-nums text-white/85">
                        {d.tempMax}°
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-400/80 to-amber-400/80"
                          style={{ width: `${Math.max(8, ((d.tempMax - 10) / 30) * 100)}%` }}
                        />
                      </div>
                      <span className="w-8 text-xs tabular-nums text-white/45">{d.tempMin}°</span>
                    </div>
                    {d.precipitationProb > 0 && (
                      <span className="w-9 text-right text-[9px] tabular-nums text-blue-300/70">
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
          <p className="mb-2.5 text-[9px] font-medium uppercase tracking-widest text-white/40">
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
                className="bg-white/6 flex items-center gap-3 rounded-xl border border-white/5 px-4 py-3"
              >
                <div className="bg-white/8 flex h-8 w-8 items-center justify-center rounded-lg text-white/50">
                  {item.icon}
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-wider text-white/40">{item.label}</p>
                  <p className="mt-0.5 text-xs font-semibold tabular-nums text-white/90">
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
            <p className="mb-2.5 text-[9px] font-medium uppercase tracking-widest text-white/40">
              Saran Hari Ini
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className="bg-white/6 flex items-center gap-2.5 rounded-xl border border-white/5 px-4 py-2.5"
                >
                  <span className="text-base">{s.icon}</span>
                  <p className="text-[10px] leading-relaxed text-white/80">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
