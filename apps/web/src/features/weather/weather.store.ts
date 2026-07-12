'use client';

import { create } from 'zustand';

export interface HourlyData {
  time: string;
  temp: number;
  feelsLike: number;
  weatherCode: number;
  precipitation: number;
}

export interface DailyData {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipitationSum: number;
  precipitationProb: number;
}

export type WeatherCondition =
  | 'sunny'
  | 'clear'
  | 'partly_cloudy'
  | 'cloudy'
  | 'overcast'
  | 'foggy'
  | 'drizzle'
  | 'rain'
  | 'heavy_rain'
  | 'rain_showers'
  | 'thunderstorm'
  | 'snow'
  | 'heavy_snow'
  | 'sleet';

export interface WeatherState {
  loading: boolean;
  error: string | null;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  condition: WeatherCondition;
  label: string;
  city: string | null;
  lat: number;
  lon: number;
  hourly: HourlyData[];
  daily: DailyData[];
  sunrise: string;
  sunset: string;
}

export interface WeatherActions {
  fetchWeather: (lat: number, lon: number, city?: string | null) => Promise<void>;
}

export function getCondition(code: number): { condition: WeatherCondition; label: string } {
  if (code === 0) return { condition: 'sunny', label: 'Cerah' };
  if (code === 1) return { condition: 'clear', label: 'Cerah Berawan' };
  if (code <= 3) return { condition: 'partly_cloudy', label: 'Berawan Sebagian' };
  if (code <= 48) return { condition: 'foggy', label: 'Berkabut' };
  if (code <= 55) return { condition: 'drizzle', label: 'Gerimis' };
  if (code <= 65) return { condition: 'rain', label: 'Hujan' };
  if (code <= 67) return { condition: 'sleet', label: 'Hujan Es' };
  if (code <= 77) return { condition: 'snow', label: 'Salju' };
  if (code <= 82) return { condition: 'rain_showers', label: 'Hujan Deras' };
  if (code <= 86) return { condition: 'heavy_snow', label: 'Salju Lebat' };
  return { condition: 'thunderstorm', label: 'Badai Petir' };
}

export const CONDITION_EMOJI: Record<WeatherCondition, string> = {
  sunny: '☀️',
  clear: '🌤',
  partly_cloudy: '⛅',
  cloudy: '☁️',
  overcast: '☁️',
  foggy: '🌫',
  drizzle: '🌦',
  rain: '🌧',
  heavy_rain: '🌧',
  rain_showers: '🌦',
  thunderstorm: '⛈',
  snow: '❄️',
  heavy_snow: '❄️',
  sleet: '🌨',
};

export function getIcon(code: number): string {
  return CONDITION_EMOJI[getCondition(code).condition] ?? '☀️';
}

function timezoneToCity(tz: string): string | null {
  if (!tz || tz === 'UTC' || tz.startsWith('Etc/')) return null;
  const parts = tz.split('/');
  if (parts.length < 2) return null;
  return parts.slice(1).join(', ').replace(/_/g, ' ');
}

async function resolveCityFromIP(): Promise<{ lat: number; lon: number; city: string } | null> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const d = await res.json();
    if (d.latitude != null && d.longitude != null) {
      return {
        lat: d.latitude,
        lon: d.longitude,
        city: d.city || d.region || d.country_name || 'Unknown',
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveCityFromCoords(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=id`,
      {
        headers: { 'User-Agent': 'arunaOS/1.0' },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address;
    const city = addr?.city || addr?.town || addr?.village || addr?.county || addr?.state;
    const country = addr?.country;
    if (city) return country ? `${city}, ${country}` : city;
    return null;
  } catch {
    return null;
  }
}

export const useWeatherStore = create<WeatherState & WeatherActions>()((set) => ({
  loading: false,
  error: null,
  temp: 0,
  feelsLike: 0,
  humidity: 0,
  windSpeed: 0,
  weatherCode: 0,
  condition: 'sunny',
  label: '',
  city: null,
  lat: -6.2088,
  lon: 106.8456,
  hourly: [],
  daily: [],
  sunrise: '',
  sunset: '',

  fetchWeather: async (lat, lon, city) => {
    set({ loading: true, error: null });

    try {
      // Resolve location via IP if no city/coordinates provided
      let useLat = lat;
      let useLon = lon;
      let resolvedCity: string | null = city || null;

      if (!resolvedCity) {
        const ip = await resolveCityFromIP();
        if (ip) {
          resolvedCity = ip.city;
          useLat = ip.lat;
          useLon = ip.lon;
        }
      }

      const params = new URLSearchParams({
        latitude: useLat.toString(),
        longitude: useLon.toString(),
        current:
          'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
        hourly: 'temperature_2m,apparent_temperature,precipitation_probability,weather_code',
        daily:
          'temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,precipitation_probability_max,sunrise,sunset',
        timezone: 'auto',
        forecast_days: '7',
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`Gagal: server merespon ${res.status}`);
      const data = await res.json();

      const c = data.current;
      const cond = getCondition(c.weather_code);

      // Fallback city resolution if IP geolocation failed
      if (!resolvedCity) {
        resolvedCity = timezoneToCity(data.timezone);
      }
      if (!resolvedCity) {
        resolvedCity = await resolveCityFromCoords(useLat, useLon);
      }
      if (!resolvedCity) {
        resolvedCity = 'Lokasi Anda';
      }

      // Process hourly — take next 7 from now
      const now = new Date();
      const hourlyIdx = data.hourly.time.findIndex((t: string) => new Date(t) >= now);
      const hourlySlice = data.hourly.time.slice(hourlyIdx, hourlyIdx + 7);
      const hourly: HourlyData[] = hourlySlice.map((_: string, i: number) => {
        const idx = hourlyIdx + i;
        return {
          time: data.hourly.time[idx],
          temp: Math.round(data.hourly.temperature_2m[idx]),
          feelsLike: Math.round(data.hourly.apparent_temperature[idx]),
          weatherCode: data.hourly.weather_code[idx],
          precipitation: data.hourly.precipitation_probability[idx] ?? 0,
        };
      });

      // Process daily
      const daily: DailyData[] = data.daily.time.map((_: string, i: number) => ({
        date: data.daily.time[i],
        tempMax: Math.round(data.daily.temperature_2m_max[i]),
        tempMin: Math.round(data.daily.temperature_2m_min[i]),
        weatherCode: data.daily.weather_code[i],
        precipitationSum: data.daily.precipitation_sum[i] ?? 0,
        precipitationProb: data.daily.precipitation_probability_max[i] ?? 0,
      }));

      set({
        loading: false,
        error: null,
        temp: Math.round(c.temperature_2m),
        feelsLike: Math.round(c.apparent_temperature),
        humidity: c.relative_humidity_2m,
        windSpeed: Math.round(c.wind_speed_10m),
        weatherCode: c.weather_code,
        condition: cond.condition,
        label: cond.label,
        city: resolvedCity,
        lat: useLat,
        lon: useLon,
        hourly,
        daily,
        sunrise: data.daily.sunrise?.[0] ?? '',
        sunset: data.daily.sunset?.[0] ?? '',
      });
    } catch (err: unknown) {
      let msg = 'Gagal memuat cuaca';
      if (err instanceof Error) {
        if (err.name === 'AbortError') msg = 'Waktu permintaan habis, coba lagi';
        else msg = err.message;
      }
      set({ loading: false, error: msg });
    }
  },
}));
