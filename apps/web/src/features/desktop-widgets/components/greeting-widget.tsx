'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Loader, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTimeGreeting } from '../stores/aruna-home.store';
import { useArunaEngine } from '@/features/engine/engine-context';

export function GreetingWidget() {
  const { engine, ready } = useArunaEngine();
  const [greeting, setGreeting] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [memoryNote, setMemoryNote] = useState<string | null>(null);

  const timeOfDay = getTimeGreeting();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      if (engine && ready) {
        try {
          const result = await engine.getMemoryGreeting();
          const moodS = await engine.generateMoodSuggestion();
          if (!cancelled) {
            setGreeting(result.greeting);
            setMood(moodS.split('—')[0]?.trim() ?? 'Focused');
            setMemoryNote(result.memoryNote ?? null);
            setLoading(false);
            return;
          }
        } catch {
          /* fall through */
        }
      }

      if (!cancelled) {
        const fallbacks: Record<string, { greeting: string; mood: string }> = {
          pagi: {
            greeting: 'Selamat pagi! ☀️ Saatnya memulai hari dengan semangat baru.',
            mood: 'Energetic',
          },
          siang: { greeting: 'Selamat siang! 🍵 Tetap produktif.', mood: 'Focused' },
          sore: { greeting: 'Selamat sore! 🌇 Bagaimana harimu?', mood: 'Reflective' },
          malam: { greeting: 'Selamat malam! 🌙 Istirahat yang cukup.', mood: 'Calm' },
        };
        const f = fallbacks[timeOfDay] ?? fallbacks.pagi!;
        setGreeting(f.greeting);
        setMood(f.mood);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [engine, ready, timeOfDay]);

  return (
    <div className="space-y-1">
      {loading ? (
        <div className="flex h-5 items-center gap-1.5">
          <Loader size={10} className="text-primary animate-spin" />
          <span className="text-foreground/40 text-[11px]">Menyiapkan sambutan...</span>
        </div>
      ) : (
        <>
          <p className={cn('text-sm leading-relaxed', 'text-foreground/90')}>
            {greeting ?? 'Selamat datang di ArunaOS!'}
          </p>
          {memoryNote && <p className="text-primary/60 text-[10px] italic">{memoryNote}</p>}
          {mood && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <Sparkles size={10} className="text-primary/60" />
              <span className="text-foreground/40 text-[10px]">
                Mood <span className="text-foreground/70 font-medium">{mood}</span>
              </span>
              {ready && <Brain size={9} className="text-foreground/20" />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
