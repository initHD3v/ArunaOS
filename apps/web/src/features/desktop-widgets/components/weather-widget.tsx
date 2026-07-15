'use client';

import { useEffect, useMemo } from 'react';
import { useWeatherStore, getCondition, CONDITION_EMOJI } from '@/features/weather/weather.store';
import { useLocationStore } from '@/stores/location.store';
import { Droplets, Wind, Loader, MapPin, Sunrise, Sunset } from 'lucide-react';

function formatHour(time: string) {
  const d = new Date(time);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatTime(iso: string) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function WeatherWidget() {
  const w = useWeatherStore();
  const ls = useLocationStore();

  useEffect(() => {
    if (!w.loading && w.hourly.length === 0) {
      const lat = ls.enabled && ls.latitude != null ? ls.latitude : -6.2088;
      const lon = ls.enabled && ls.longitude != null ? ls.longitude : 106.8456;
      w.fetchWeather(lat, lon, ls.city);
    }
  }, []);

  const nextHours = useMemo(() => {
    if (w.hourly.length === 0) return [];
    return w.hourly.slice(0, 4);
  }, [w.hourly]);

  if (w.loading && w.hourly.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Loader size={14} className="text-foreground/30 animate-spin" />
        <span className="text-foreground/30 text-[10px]">Memuat cuaca...</span>
      </div>
    );
  }

  if (w.error && w.hourly.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-danger/50 text-[10px]">{w.error}</span>
        <button
          onClick={() => {
            const lat = ls.enabled && ls.latitude != null ? ls.latitude : -6.2088;
            const lon = ls.enabled && ls.longitude != null ? ls.longitude : 106.8456;
            w.fetchWeather(lat, lon, ls.city);
          }}
          className="text-foreground/30 hover:text-foreground/60 ml-auto text-[9px] transition-colors"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{CONDITION_EMOJI[w.condition]}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-foreground text-xl font-light tabular-nums">{w.temp}°</span>
            <span className="text-foreground/40 truncate text-[10px]">{w.label}</span>
          </div>
          <div className="text-foreground/30 flex items-center gap-1 text-[9px]">
            <MapPin size={8} />
            <span className="truncate">{w.city ?? 'Lokasi Anda'}</span>
          </div>
        </div>
      </div>

      <div className="text-foreground/40 flex gap-3 text-[10px]">
        <span className="flex items-center gap-1">
          <Droplets size={10} />
          {w.humidity}%
        </span>
        <span className="flex items-center gap-1">
          <Wind size={10} />
          {w.windSpeed} km/h
        </span>
        <span className="flex items-center gap-1">
          <Sunrise size={10} />
          {formatTime(w.sunrise)}
        </span>
        <span className="flex items-center gap-1">
          <Sunset size={10} />
          {formatTime(w.sunset)}
        </span>
      </div>

      {nextHours.length > 0 && (
        <div className="border-border/20 flex gap-1.5 border-t pt-2">
          {nextHours.map((h, i) => {
            const cond = getCondition(h.weatherCode);
            return (
              <div
                key={h.time}
                className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg py-1"
              >
                <span className="text-foreground/40 text-[8px]">
                  {i === 0 ? 'Skrg' : formatHour(h.time)}
                </span>
                <span className="text-xs">{CONDITION_EMOJI[cond.condition]}</span>
                <span className="text-foreground/70 text-[10px] font-medium tabular-nums">
                  {h.temp}°
                </span>
                {h.precipitation > 0 && (
                  <span className="text-[7px] tabular-nums text-blue-400/70">
                    {h.precipitation}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-foreground/30 text-[9px]">Terasa {w.feelsLike}°C</p>
    </div>
  );
}
