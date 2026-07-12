import type { WeatherState } from './weather.store';

interface Suggestion {
  icon: string;
  text: string;
}

const MORNING_TIPS: Record<string, Suggestion[]> = {
  sunny: [
    { icon: '🧴', text: 'Gunakan tabir surya jika beraktivitas di luar' },
    { icon: '🕶', text: 'Hari cerah, cocok untuk jalan pagi' },
  ],
  rain: [
    { icon: '☂️', text: 'Bawa payung, hujan diperkirakan turun' },
    { icon: '🚗', text: 'Hati-hati di jalan, kondisi licin' },
  ],
  thunderstorm: [
    { icon: '⏸️', text: 'Sebaiknya tunda aktivitas luar ruangan' },
    { icon: '⚡', text: 'Amankan perangkat elektronik dari petir' },
  ],
  snow: [
    { icon: '🧣', text: 'Kenakan pakaian hangat' },
    { icon: '⚠️', text: 'Waspada jalanan licin' },
  ],
  foggy: [
    { icon: '🚗', text: 'Berkendara dengan hati-hati, jarak pandang terbatas' },
    { icon: '💡', text: 'Nyalakan lampu kabut jika berkendara' },
  ],
};

function getGeneralTips(temp: number): Suggestion[] {
  const tips: Suggestion[] = [];
  if (temp > 32) tips.push({ icon: '🥵', text: 'Cuaca sangat panas, perbanyak minum air' });
  if (temp < 20) tips.push({ icon: '🧥', text: 'Udara dingin, kenakan jaket' });
  return tips;
}

export function getWeatherSummary(state: WeatherState): string {
  const parts: string[] = [];
  parts.push(`Saat ini ${state.label.toLowerCase()} dengan suhu ${state.temp}°C`);
  if (state.feelsLike !== state.temp) parts.push(`terasa ${state.feelsLike}°C`);

  if (state.hourly.length > 0) {
    const maxHourly = Math.max(...state.hourly.map((h) => h.temp));
    const minHourly = Math.min(...state.hourly.map((h) => h.temp));
    if (maxHourly !== minHourly)
      parts.push(`dalam 7 jam ke depan suhu antara ${minHourly}°C - ${maxHourly}°C`);
  }

  const highestRain = Math.max(
    ...state.daily.filter((_, i) => i < 3).map((d) => d.precipitationProb),
  );
  if (highestRain > 50) parts.push('potensi hujan tinggi dalam beberapa hari ke depan');

  return parts.join('. ') + '.';
}

export function getWeatherSuggestions(state: WeatherState, hour: number): Suggestion[] {
  const isMorning = hour >= 4 && hour < 11;
  const isAfternoon = hour >= 11 && hour < 15;
  const isEvening = hour >= 15 && hour < 19;

  const conditionKey = state.condition;
  const tips: Suggestion[] = [];

  // Condition-specific tips
  const conditionTips = MORNING_TIPS[conditionKey];
  if (conditionTips) {
    const t = conditionTips[Math.floor(Math.random() * conditionTips.length)];
    if (t) tips.push(t);
  }

  // General tips
  tips.push(...getGeneralTips(state.temp));

  // Time-based tips
  if (isMorning && ['sunny', 'clear', 'partly_cloudy'].includes(conditionKey)) {
    tips.push({ icon: '🏃', text: 'Pagi yang segar, cocok untuk olahraga ringan' });
  }
  if (isAfternoon && conditionKey === 'sunny') {
    tips.push({ icon: '😎', text: 'Siang terik, hindari paparan langsung terlalu lama' });
  }
  if (isEvening && ['sunny', 'clear', 'partly_cloudy'].includes(conditionKey)) {
    tips.push({ icon: '🌇', text: 'Sore yang cerah, nikmati waktu luang di luar' });
  }

  return tips.slice(0, 3);
}

export function getDailyDescription(daily: {
  tempMax: number;
  tempMin: number;
  precipitationProb: number;
  label: string;
}): string {
  return (
    `${daily.label}, ${daily.tempMax}°/${daily.tempMin}°` +
    (daily.precipitationProb > 0 ? `, 🌧️${daily.precipitationProb}%` : '')
  );
}
