'use client';

import { useEffect } from 'react';
import {
  Cloud,
  CloudRain,
  CloudSnow,
  Sun,
  CloudLightning,
  Wind,
  Droplets,
  Loader,
} from 'lucide-react';
import { useArunaHomeStore } from '../stores/aruna-home.store';
import { useLocationStore } from '@/stores/location.store';

function getWeatherIcon(condition: string) {
  const c = condition.toLowerCase();
  if (c.includes('clear') || c.includes('sunny')) return <Sun size={32} className="text-warning" />;
  if (c.includes('cloud')) return <Cloud size={32} className="text-foreground/50" />;
  if (c.includes('rain') || c.includes('drizzle'))
    return <CloudRain size={32} className="text-primary" />;
  if (c.includes('snow')) return <CloudSnow size={32} className="text-primary" />;
  if (c.includes('thunder') || c.includes('lightning'))
    return <CloudLightning size={32} className="text-danger" />;
  return <Sun size={32} className="text-warning" />;
}

const wmoCodes: Record<number, { label: string; icon: string }> = {
  0: { label: 'Clear sky', icon: 'sunny' },
  1: { label: 'Mainly clear', icon: 'sunny' },
  2: { label: 'Partly cloudy', icon: 'cloud' },
  3: { label: 'Overcast', icon: 'cloud' },
  45: { label: 'Foggy', icon: 'cloud' },
  48: { label: 'Depositing rime fog', icon: 'cloud' },
  51: { label: 'Light drizzle', icon: 'rain' },
  53: { label: 'Moderate drizzle', icon: 'rain' },
  55: { label: 'Dense drizzle', icon: 'rain' },
  61: { label: 'Slight rain', icon: 'rain' },
  63: { label: 'Moderate rain', icon: 'rain' },
  65: { label: 'Heavy rain', icon: 'rain' },
  71: { label: 'Slight snow', icon: 'snow' },
  73: { label: 'Moderate snow', icon: 'snow' },
  75: { label: 'Heavy snow', icon: 'snow' },
  80: { label: 'Slight rain showers', icon: 'rain' },
  81: { label: 'Moderate rain showers', icon: 'rain' },
  82: { label: 'Violent rain showers', icon: 'rain' },
  95: { label: 'Thunderstorm', icon: 'thunder' },
  96: { label: 'Thunderstorm with slight hail', icon: 'thunder' },
  99: { label: 'Thunderstorm with heavy hail', icon: 'thunder' },
};

type Coords = { lat: number; lon: number };

export function WeatherWidget() {
  const weather = useArunaHomeStore((s) => s.weather);
  const weatherLoading = useArunaHomeStore((s) => s.weatherLoading);
  const setWeather = useArunaHomeStore((s) => s.setWeather);
  const setWeatherLoading = useArunaHomeStore((s) => s.setWeatherLoading);
  const ls = useLocationStore();

  useEffect(() => {
    let cancelled = false;
    setWeatherLoading(true);

    async function run() {
      let coords: Coords;
      let cityName: string | null = null;

      if (ls.enabled && ls.latitude != null && ls.longitude != null) {
        coords = { lat: ls.latitude, lon: ls.longitude };
        cityName = ls.city;
      } else {
        coords = { lat: -6.2088, lon: 106.8456 };
        try {
          const ipRes = await fetch('https://ipapi.co/json/', {
            signal: AbortSignal.timeout(3000),
          });
          if (ipRes.ok) {
            const d = await ipRes.json();
            if (d.latitude && d.longitude) coords = { lat: d.latitude, lon: d.longitude };
            if (d.city) cityName = d.city;
          }
        } catch {
          /* defaults */
        }
      }

      try {
        const params = new URLSearchParams({
          latitude: coords.lat.toString(),
          longitude: coords.lon.toString(),
          current:
            'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
          timezone: 'auto',
        });
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`Weather API: ${res.status}`);
        const data = await res.json();
        const cur = data.current;
        const code = cur.weather_code as number;

        if (!cityName) {
          try {
            const geo = await fetch(
              `https://geocoding-api.open-meteo.com/v1/search?name=${coords.lat},${coords.lon}&count=1&language=en&format=json`,
              { signal: AbortSignal.timeout(3000) },
            );
            if (geo.ok) {
              const gd = await geo.json();
              if (gd.results?.[0]?.name)
                cityName = `${gd.results[0].name}${gd.results[0].country ? `, ${gd.results[0].country}` : ''}`;
            }
          } catch {
            /* ignore */
          }
        }

        if (!cancelled) {
          setWeather({
            temp: Math.round(cur.temperature_2m),
            condition: wmoCodes[code]?.label ?? 'Unknown',
            icon: wmoCodes[code]?.icon ?? 'sunny',
            humidity: cur.relative_humidity_2m,
            wind: Math.round(cur.wind_speed_10m),
            city: cityName ?? 'Your Location',
          });
        }
      } catch {
        if (!cancelled)
          setWeather({
            temp: 0,
            condition: 'Gagal',
            icon: 'cloud',
            humidity: 0,
            wind: 0,
            city: 'Unknown',
          });
      } finally {
        if (!cancelled) setWeatherLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [ls.enabled, ls.latitude, ls.longitude, ls.city, setWeather, setWeatherLoading]);

  if (weatherLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader size={14} className="text-foreground/30 animate-spin" />
        <span className="text-foreground/30 text-[10px]">Memuat cuaca...</span>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {getWeatherIcon(weather.condition)}
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-foreground text-xl font-light">{weather.temp}°</span>
            <span className="text-foreground/40 text-[10px]">{weather.condition}</span>
          </div>
          <p className="text-foreground/30 text-[9px]">{weather.city}</p>
        </div>
      </div>
      <div className="text-foreground/40 flex gap-3 text-[10px]">
        <span className="flex items-center gap-1">
          <Droplets size={10} />
          {weather.humidity}%
        </span>
        <span className="flex items-center gap-1">
          <Wind size={10} />
          {weather.wind} km/h
        </span>
      </div>
    </div>
  );
}
