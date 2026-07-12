'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LocationState {
  enabled: boolean;
  permissionAsked: boolean;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  error: string | null;
  loading: boolean;
}

export interface LocationActions {
  requestPermission: () => Promise<boolean>;
  refreshLocation: () => Promise<void>;
  toggleEnabled: () => void;
  reset: () => void;
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
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
    if (data.display_name) return data.display_name.split(', ').slice(0, 2).join(', ');
    return null;
  } catch {
    return null;
  }
}

function getPosition(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export const useLocationStore = create<LocationState & LocationActions>()(
  persist(
    (set, get) => ({
      enabled: false,
      permissionAsked: false,
      latitude: null,
      longitude: null,
      city: null,
      error: null,
      loading: false,

      requestPermission: async () => {
        if (!navigator.geolocation) {
          set({
            error: 'Geolocation tidak didukung browser ini',
            permissionAsked: true,
            enabled: false,
          });
          return false;
        }

        set({ loading: true, error: null });

        try {
          const pos = await getPosition({ enableHighAccuracy: true, timeout: 10000 });
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const city = await reverseGeocode(lat, lon);
          set({
            enabled: true,
            permissionAsked: true,
            latitude: lat,
            longitude: lon,
            city,
            loading: false,
            error: null,
          });
          return true;
        } catch (err: unknown) {
          const pe = err as { code?: number };
          const msg =
            pe.code === 1
              ? 'Izin lokasi ditolak'
              : pe.code === 2
                ? 'Posisi tidak tersedia'
                : pe.code === 3
                  ? 'Waktu permintaan lokasi habis'
                  : 'Gagal mendapatkan lokasi';
          set({ enabled: false, permissionAsked: true, error: msg, loading: false });
          return false;
        }
      },

      refreshLocation: async () => {
        const { enabled, permissionAsked } = get();
        if (!enabled || !permissionAsked) return;

        try {
          const pos = await getPosition({ enableHighAccuracy: false, timeout: 5000 });
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const city = await reverseGeocode(lat, lon);
          set({ latitude: lat, longitude: lon, city, error: null });
        } catch {
          // silent — keep old location
        }
      },

      toggleEnabled: () => {
        const { enabled, permissionAsked } = get();
        if (!enabled && !permissionAsked) {
          get().requestPermission();
        } else {
          set({ enabled: !enabled });
        }
      },

      reset: () =>
        set({
          enabled: false,
          permissionAsked: false,
          latitude: null,
          longitude: null,
          city: null,
          error: null,
        }),
    }),
    {
      name: 'arunaos-location',
      partialize: (state) => ({
        enabled: state.enabled,
        permissionAsked: state.permissionAsked,
        latitude: state.latitude,
        longitude: state.longitude,
        city: state.city,
        error: state.error,
      }),
    },
  ),
);

export function requestLocationIfNeeded() {
  const { permissionAsked } = useLocationStore.getState();
  if (!permissionAsked) {
    useLocationStore.getState().requestPermission();
  }
}

export function startBackgroundRefresh() {
  const { enabled, permissionAsked } = useLocationStore.getState();
  if (enabled && permissionAsked) {
    useLocationStore.getState().refreshLocation();
  }
}
