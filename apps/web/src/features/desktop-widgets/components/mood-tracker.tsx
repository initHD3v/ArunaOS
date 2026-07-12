'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useArunaEngine } from '@/features/engine/engine-context';
import { Activity } from 'lucide-react';

const MOODS = [
  { label: 'Energetic', color: 'bg-orange-400/60', bar: 'bg-orange-400/30' },
  { label: 'Focused', color: 'bg-blue-400/60', bar: 'bg-blue-400/30' },
  { label: 'Creative', color: 'bg-purple-400/60', bar: 'bg-purple-400/30' },
  { label: 'Calm', color: 'bg-green-400/60', bar: 'bg-green-400/30' },
  { label: 'Reflective', color: 'bg-teal-400/60', bar: 'bg-teal-400/30' },
  { label: 'Productive', color: 'bg-emerald-400/60', bar: 'bg-emerald-400/30' },
  { label: 'Patient', color: 'bg-indigo-400/60', bar: 'bg-indigo-400/30' },
];

export function MoodTracker() {
  const { engine, ready } = useArunaEngine();
  const [selected, setSelected] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [weekly, setWeekly] = useState<{ mood: string; count: number }[]>([]);

  useEffect(() => {
    const eng = engine;
    if (!eng || !ready) return;
    (async () => {
      try {
        const insights = await eng!.getInsights();
        const mi = insights.find((i) => i.type === 'mood_trend');
        if (mi)
          setWeekly([
            {
              mood: mi.description.replace('Mood dominan minggu ini: ', ''),
              count: Math.round(mi.confidence * 10),
            },
          ]);
        const session = await eng!.getMemoryStore().getTodaySession();
        if (session?.mood) setSelected(session.mood);
      } catch {
        /* ignore */
      }
    })();
  }, [engine, ready]);

  async function handleSelect(mood: string) {
    const next = selected === mood ? null : mood;
    setSelected(next);
    setSaved(false);
    if (next && engine) {
      try {
        await engine.saveMood(next);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Activity size={11} className="text-primary/60" />
        <span className="text-foreground/40 text-[10px] uppercase tracking-wider">Suasana</span>
        {saved && <span className="text-success ml-auto text-[9px]">Tersimpan</span>}
      </div>

      <div className="flex flex-wrap gap-1">
        {MOODS.map((m) => (
          <button
            key={m.label}
            onClick={() => handleSelect(m.label)}
            className={cn(
              'rounded-md px-2 py-0.5 text-[10px] transition-all',
              selected === m.label
                ? `${m.color} font-medium text-white`
                : 'text-foreground/40 hover:text-foreground/70 bg-card/80 hover:bg-card',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {weekly.length > 0 && (
        <div className="border-border/20 border-t pt-2">
          <p className="text-foreground/30 mb-1 text-[9px]">Minggu ini</p>
          <div className="flex h-6 items-end gap-1">
            {MOODS.map((m) => {
              const f = weekly.find((w) => w.mood === m.label);
              const h = f ? Math.max(f.count * 5, 3) : 3;
              return (
                <div
                  key={m.label}
                  className="flex-1 rounded-t-sm"
                  style={{ height: h }}
                  title={`${m.label}`}
                >
                  <div className={cn('h-full rounded-t-sm', f ? m.bar : 'bg-card/80')} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
