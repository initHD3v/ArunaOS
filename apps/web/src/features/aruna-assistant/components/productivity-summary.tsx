'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Target, Zap, Calendar } from 'lucide-react';
import { useArunaAssistantStore } from '../stores/aruna-assistant-store';
import { useArunaEngine } from '@/features/engine/engine-context';

export function ProductivitySummary() {
  const productivitySummary = useArunaAssistantStore((s) => s.productivitySummary);
  const { engine, ready } = useArunaEngine();
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    if (!engine || !ready) return;
    engine
      .getInsights()
      .then((result) => {
        setInsights(result.filter((i) => i.confidence > 0.4).map((i) => i.description));
      })
      .catch(() => {});
  }, [engine, ready]);

  const summary = productivitySummary;
  if (!summary && insights.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span
        className="text-[11px] font-medium uppercase tracking-[0.06em]"
        style={{ color: '#707070' }}
      >
        Produktivitas
      </span>
      <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: '#F7F8FA' }}>
        {summary && (
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={12} style={{ color: '#5D6BFF' }} />
              <span className="text-[11px] font-medium" style={{ color: '#111111' }}>
                {summary.today.tasksCompleted} tugas selesai
              </span>
            </div>
            <div className="flex items-center gap-1">
              {summary.trend === 'improving' ? (
                <TrendingUp size={11} style={{ color: '#30D158' }} />
              ) : summary.trend === 'declining' ? (
                <TrendingDown size={11} style={{ color: '#FF5A5F' }} />
              ) : (
                <Minus size={11} style={{ color: '#707070' }} />
              )}
              <span className="text-[9px]" style={{ color: '#707070' }}>
                Streak {summary.streak} hr
              </span>
            </div>
          </div>
        )}

        {insights.length > 0 && (
          <div className="space-y-1">
            {insights.slice(0, 2).map((s, i) => (
              <div key={i} className="flex items-start gap-1.5">
                {s.toLowerCase().includes('produktif') ? (
                  <Zap size={9} className="mt-0.5 shrink-0" style={{ color: '#FFB340' }} />
                ) : (
                  <Calendar size={9} className="mt-0.5 shrink-0" style={{ color: '#5D6BFF' }} />
                )}
                <span className="text-[10px] leading-relaxed" style={{ color: '#707070' }}>
                  {s}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
