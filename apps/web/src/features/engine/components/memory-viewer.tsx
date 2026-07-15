'use client';

import { useEffect, useState } from 'react';
import { useArunaEngine } from '@/features/engine/engine-context';
import { Brain, Activity, Calendar, TrendingUp, Zap } from 'lucide-react';

export function MemoryViewer() {
  const { engine, ready } = useArunaEngine();
  const [insights, setInsights] = useState<string[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [topMood, setTopMood] = useState('-');

  useEffect(() => {
    if (!engine || !ready) return;
    engine
      .getInsights()
      .then((result) => {
        setInsights(result.filter((i) => i.confidence > 0.4).map((i) => i.description));
      })
      .catch(() => {});
    engine
      .getMemoryStore()
      .getRecentSessions(30)
      .then((sessions) => {
        setSessionCount(sessions.length);
        const moods = sessions.filter((s) => s.mood);
        if (moods.length > 0) {
          const counts: Record<string, number> = {};
          for (const s of moods) {
            if (s.mood) counts[s.mood] = (counts[s.mood] ?? 0) + 1;
          }
          const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
          if (top) setTopMood(top[0]);
        }
      })
      .catch(() => {});
  }, [engine, ready]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Brain size={14} className="text-primary" />
        <span className="text-foreground/80 text-xs font-medium">Memory & Learning</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="border-border/20 flex flex-col items-center gap-1 rounded-xl border p-2.5">
          <Activity size={12} className="text-primary/60" />
          <span className="text-foreground text-sm font-semibold tabular-nums">
            {engine ? (ready ? 'Aktif' : 'Booting') : '-'}
          </span>
          <span className="text-foreground/30 text-[9px]">Status</span>
        </div>
        <div className="border-border/20 flex flex-col items-center gap-1 rounded-xl border p-2.5">
          <Calendar size={12} className="text-primary/60" />
          <span className="text-foreground text-sm font-semibold tabular-nums">{sessionCount}</span>
          <span className="text-foreground/30 text-[9px]">Sesi</span>
        </div>
        <div className="border-border/20 flex flex-col items-center gap-1 rounded-xl border p-2.5">
          <TrendingUp size={12} className="text-primary/60" />
          <span className="text-foreground text-sm font-semibold">{topMood}</span>
          <span className="text-foreground/30 text-[9px]">Mood</span>
        </div>
      </div>

      {insights.length > 0 && (
        <div className="border-border/20 space-y-1.5 rounded-xl border p-2.5">
          <div className="flex items-center gap-1.5">
            <Zap size={10} className="text-warning" />
            <span className="text-foreground/50 text-[9px] uppercase tracking-wider">Insights</span>
          </div>
          {insights.slice(0, 3).map((s, i) => (
            <p key={i} className="text-foreground/60 text-[10px] leading-relaxed">
              • {s}
            </p>
          ))}
        </div>
      )}

      <p className="text-foreground/20 text-[8px]">
        Data disimpan secara lokal di IndexedDB. Tidak dikirim ke server.
      </p>
    </div>
  );
}
