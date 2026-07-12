export interface SystemContext {
  timeOfDay: string;
  date: string;
  hour: number;
  activeApps: string[];
  focusedApp: string | null;
  tasks: { total: number; done: number };
  unreadNotifications: number;
  recentFiles: string[];
}

export function getSystemContext(): SystemContext {
  const now = new Date();
  const h = now.getHours();
  let timeOfDay: string;
  if (h >= 4 && h < 11) timeOfDay = 'pagi';
  else if (h >= 11 && h < 15) timeOfDay = 'siang';
  else if (h >= 15 && h < 19) timeOfDay = 'sore';
  else timeOfDay = 'malam';

  return {
    timeOfDay,
    date: now.toISOString().slice(0, 10),
    hour: h,
    activeApps: [],
    focusedApp: null,
    tasks: { total: 0, done: 0 },
    unreadNotifications: 0,
    recentFiles: [],
  };
}
