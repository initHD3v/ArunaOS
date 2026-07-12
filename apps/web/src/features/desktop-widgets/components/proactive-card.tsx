'use client';

import { useEffect, useState } from 'react';
import { Lightbulb, Sparkles, Loader } from 'lucide-react';
import { useArunaEngine } from '@/features/engine/engine-context';

export function ProactiveCard() {
  const { engine, ready } = useArunaEngine();
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const eng = engine;
    if (!eng || !ready) return;
    let cancelled = false;
    setLoading(true);

    async function load() {
      const result: string[] = [];
      try {
        const insights = await eng!.getInsights();
        for (const ins of insights) {
          if (ins.confidence > 0.4) result.push(ins.description);
        }
      } catch {
        /* ignore */
      }
      try {
        const s = await eng!.generateSuggestion();
        if (s && !result.includes(s)) result.push(s);
      } catch {
        /* ignore */
      }
      if (!cancelled) {
        setItems(result);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [engine, ready]);

  if (loading) {
    return (
      <div className="flex h-5 items-center gap-1.5">
        <Loader size={10} className="text-primary animate-spin" />
        <span className="text-foreground/40 text-[11px]">Memikirkan saran...</span>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Lightbulb size={11} className="text-warning" />
        <span className="text-foreground/40 text-[10px] uppercase tracking-wider">Saran</span>
      </div>
      <div className="space-y-1">
        {items.map((s, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <Sparkles size={8} className="text-primary/40 mt-0.5 shrink-0" />
            <p className="text-foreground/60 text-[11px] leading-relaxed">{s}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
