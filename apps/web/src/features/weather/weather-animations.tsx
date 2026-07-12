'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { WeatherCondition } from './weather.store';

/* ─── B G   G r a d i e n t   ─── */
function useBgGradient(condition: WeatherCondition, isNight: boolean): string {
  return useMemo(() => {
    if (isNight) return 'from-slate-900 via-slate-800 to-indigo-950/80';

    switch (condition) {
      case 'sunny':
      case 'clear':
        return 'from-sky-400 via-blue-300 to-amber-200/60';
      case 'partly_cloudy':
      case 'cloudy':
      case 'overcast':
        return 'from-slate-400 via-slate-300 to-gray-200/60';
      case 'foggy':
        return 'from-stone-400 via-stone-300 to-stone-200/60';
      case 'drizzle':
      case 'rain':
      case 'heavy_rain':
      case 'rain_showers':
        return 'from-slate-600 via-blue-500 to-slate-400/60';
      case 'thunderstorm':
        return 'from-slate-800 via-purple-900 to-slate-700/60';
      case 'snow':
      case 'heavy_snow':
      case 'sleet':
        return 'from-sky-100 via-blue-100 to-white/60';
      default:
        return 'from-sky-400 via-blue-300 to-amber-200/60';
    }
  }, [condition, isNight]);
}

/* ─── D r o p l e t s   ─── */
function RainDrops({ count = 20 }: { count?: number }) {
  const drops = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
        duration: `${0.6 + Math.random() * 0.4}s`,
        height: `${12 + Math.random() * 18}px`,
        opacity: 0.15 + Math.random() * 0.25,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`@keyframes rainFall { to { transform: translateY(100vh); } }`}</style>
      {drops.map((d, i) => (
        <span
          key={i}
          className="absolute w-[1px] rounded-full bg-white/40"
          style={{
            left: d.left,
            top: '-20px',
            height: d.height,
            opacity: d.opacity,
            animation: `rainFall ${d.duration} linear ${d.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── S n o w   ─── */
function Snowflakes({ count = 20 }: { count?: number }) {
  const flakes = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 5}s`,
        duration: `${3 + Math.random() * 4}s`,
        size: `${3 + Math.random() * 6}px`,
        drift: `${(Math.random() - 0.5) * 60}px`,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes snowFall {
          0% { transform: translateY(-10px) translateX(0); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(100vh) translateX(var(--drift)); opacity: 0; }
        }
      `}</style>
      {flakes.map((f, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: f.left,
            top: '-10px',
            width: f.size,
            height: f.size,
            opacity: 0,
            animation: `snowFall ${f.duration} ease-in-out ${f.delay} infinite`,
            ['--drift' as string]: f.drift,
          }}
        />
      ))}
    </div>
  );
}

/* ─── C l o u d   E f f e c t   ─── */
function CloudOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes cloudDrift {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120vw); }
        }
      `}</style>
      <div
        className="absolute top-[10%] h-16 w-32 rounded-full bg-white/10 blur-xl"
        style={{ animation: 'cloudDrift 25s linear infinite' }}
      />
      <div
        className="bg-white/8 absolute top-[30%] h-12 w-24 rounded-full blur-xl"
        style={{ animation: 'cloudDrift 35s linear 5s infinite' }}
      />
      <div
        className="bg-white/6 absolute top-[55%] h-14 w-28 rounded-full blur-xl"
        style={{ animation: 'cloudDrift 30s linear 12s infinite' }}
      />
    </div>
  );
}

/* ─── S u n   G l o w   ─── */
function SunGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes sunPulse {
          0%, 100% { transform: scale(1); opacity: 0.25; }
          50% { transform: scale(1.08); opacity: 0.35; }
        }
      `}</style>
      <div
        className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-yellow-400/20 blur-3xl"
        style={{ animation: 'sunPulse 4s ease-in-out infinite' }}
      />
      <div
        className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-300/15 blur-2xl"
        style={{ animation: 'sunPulse 4s ease-in-out 1s infinite' }}
      />
    </div>
  );
}

/* ─── T h u n d e r   F l a s h   ─── */
function ThunderFlash() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes thunderFlash {
          0%, 100% { opacity: 0; }
          5% { opacity: 0.3; }
          6% { opacity: 0; }
          10% { opacity: 0.2; }
          11% { opacity: 0; }
        }
      `}</style>
      <div
        className="absolute inset-0 bg-white"
        style={{ animation: 'thunderFlash 8s ease-in-out infinite' }}
      />
    </div>
  );
}

/* ─── F o g   O v e r l a y   ─── */
function FogOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes fogShift {
          0%, 100% { opacity: 0.3; transform: translateX(0); }
          50% { opacity: 0.5; transform: translateX(20px); }
        }
      `}</style>
      <div
        className="absolute inset-0 bg-white/10 backdrop-blur-[1px]"
        style={{ animation: 'fogShift 6s ease-in-out infinite' }}
      />
    </div>
  );
}

/* ─── M a i n   A n i m a t i o n   W r a p p e r   ─── */
export function WeatherBackground({
  condition,
  isNight,
}: {
  condition: WeatherCondition;
  isNight: boolean;
}) {
  const gradient = useBgGradient(condition, isNight);

  return (
    <div
      className={cn(
        'absolute inset-0 transition-colors duration-700',
        'bg-gradient-to-br',
        gradient,
      )}
    >
      {condition === 'sunny' || condition === 'clear' ? <SunGlow /> : null}
      {condition === 'partly_cloudy' || condition === 'cloudy' || condition === 'overcast' ? (
        <CloudOverlay />
      ) : null}
      {condition === 'foggy' ? <FogOverlay /> : null}
      {condition === 'drizzle' || condition === 'rain' || condition === 'heavy_rain' ? (
        <RainDrops count={30} />
      ) : null}
      {condition === 'rain_showers' ? <RainDrops count={40} /> : null}
      {condition === 'thunderstorm' ? (
        <>
          <RainDrops count={50} />
          <ThunderFlash />
        </>
      ) : null}
      {condition === 'snow' ? <Snowflakes count={25} /> : null}
      {condition === 'heavy_snow' ? <Snowflakes count={40} /> : null}
      {condition === 'sleet' ? (
        <>
          <RainDrops count={15} />
          <Snowflakes count={10} />
        </>
      ) : null}
    </div>
  );
}
