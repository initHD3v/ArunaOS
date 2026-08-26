'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getAccuratePosition, reverseGeocode } from '@/lib/geolocation';

export interface LocationState {
  enabled: boolean;
  permissionAsked: boolean;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
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

export const useLocationStore = create<LocationState & LocationActions>()(
  persist(
    (set, get) => ({
      enabled: false,
      permissionAsked: false,
      latitude: null,
      longitude: null,
      accuracy: null,
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
          // Multiple high-accuracy fixes — desktop WiFi/IP geolocation is
          // often kilometers off on the first reading.
          const fix = await getAccuratePosition({ attempts: 3 });
          const city = await reverseGeocode(fix.lat, fix.lon);
          set({
            enabled: true,
            permissionAsked: true,
            latitude: fix.lat,
            longitude: fix.lon,
            accuracy: fix.accuracy,
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
          const fix = await getAccuratePosition({ attempts: 2, timeoutMs: 8000 });
          const city = await reverseGeocode(fix.lat, fix.lon);
          set({ latitude: fix.lat, longitude: fix.lon, accuracy: fix.accuracy, city, error: null });
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
          accuracy: null,
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
        accuracy: state.accuracy,
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
