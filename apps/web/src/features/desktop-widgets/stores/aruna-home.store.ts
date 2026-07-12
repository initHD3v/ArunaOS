import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DISMISS_KEY = 'arunaos-home-dismissed';

export interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
  humidity: number;
  wind: number;
  city: string;
}

export interface TaskItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

export interface ArunaHomeState {
  dismissed: boolean;
  greeting: string | null;
  mood: string | null;
  greetingLoading: boolean;
  weather: WeatherData | null;
  weatherLoading: boolean;
  tasks: TaskItem[];
}

export interface ArunaHomeActions {
  dismiss: () => void;
  checkAndReset: () => void;
  setGreeting: (greeting: string, mood: string) => void;
  setGreetingLoading: (loading: boolean) => void;
  setWeather: (weather: WeatherData) => void;
  setWeatherLoading: (loading: boolean) => void;
  addTask: (text: string) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  shouldShow: () => boolean;
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function wasDismissedToday(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === getTodayKey();
  } catch {
    return false;
  }
}

export function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h >= 4 && h < 11) return 'pagi';
  if (h >= 11 && h < 15) return 'siang';
  if (h >= 15 && h < 19) return 'sore';
  return 'malam';
}

export function getTimeEmoji(): string {
  const h = new Date().getHours();
  if (h >= 4 && h < 11) return '🌅';
  if (h >= 11 && h < 15) return '☀️';
  if (h >= 15 && h < 19) return '🌇';
  return '🌙';
}

export const useArunaHomeStore = create<ArunaHomeState & ArunaHomeActions>()(
  persist(
    (set) => ({
      dismissed: wasDismissedToday(),
      greeting: null,
      mood: null,
      greetingLoading: false,
      weather: null,
      weatherLoading: false,
      tasks: [],

      dismiss: () => {
        try {
          localStorage.setItem(DISMISS_KEY, getTodayKey());
        } catch {
          /* ignore */
        }
        set({ dismissed: true });
      },

      checkAndReset: () => {
        const today = getTodayKey();
        try {
          const stored = localStorage.getItem(DISMISS_KEY);
          if (stored !== today) {
            localStorage.removeItem(DISMISS_KEY);
            set({ dismissed: false, greeting: null, mood: null, weather: null });
          }
        } catch {
          /* ignore */
        }
      },

      setGreeting: (greeting, mood) => set({ greeting, mood, greetingLoading: false }),
      setGreetingLoading: (loading) => set({ greetingLoading: loading }),
      setWeather: (weather) => set({ weather, weatherLoading: false }),
      setWeatherLoading: (loading) => set({ weatherLoading: loading }),

      addTask: (text) =>
        set((s) => ({
          tasks: [
            ...s.tasks,
            { id: `task-${Date.now()}`, text, done: false, createdAt: Date.now() },
          ],
        })),

      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        })),

      removeTask: (id) =>
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id),
        })),

      shouldShow: () => !wasDismissedToday(),
    }),
    {
      name: 'arunaos-home',
      partialize: (state) => ({
        tasks: state.tasks,
      }),
    },
  ),
);
