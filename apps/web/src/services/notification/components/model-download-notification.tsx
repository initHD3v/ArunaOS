'use client';

import { useEffect, useRef } from 'react';
import { useArunaEngine } from '@/features/engine/engine-context';

const SOURCE = 'ai-assistant';

function cleanModelName(modelId?: string): string {
  if (!modelId) return 'Model';
  return modelId.replace(/^onnx-community\//, '').replace(/^Xenova\//, '');
}

export function ModelDownloadNotification() {
  const active = useRef(false);
  const lastPct = useRef(-1);
  const { engine, ready } = useArunaEngine();

  useEffect(() => {
    if (!engine || !ready) return;
    const hub = engine.getNotificationHub();

    const handler = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          status: string;
          loaded: number;
          total: number;
          modelId?: string;
          error?: string;
        }>
      ).detail;
      const modelName = cleanModelName(detail.modelId);

      if ((detail.status === 'downloading' || detail.status === 'initiate') && !active.current) {
        active.current = true;
        lastPct.current = -1;
        hub.push({
          title: `Downloading ${modelName}`,
          body: 'Starting download...',
          source: SOURCE,
          priority: 'normal',
          sourceAction: 'arunaos.ai',
        });
        return;
      }

      if (detail.status === 'progress' && detail.total > 0 && active.current) {
        const pct = Math.min(100, Math.round((detail.loaded / detail.total) * 100));
        if (pct !== lastPct.current && pct % 25 === 0 && pct < 100) {
          lastPct.current = pct;
          hub.push({
            title: `Downloading ${modelName}`,
            body: `${pct}% complete`,
            source: SOURCE,
            priority: 'normal',
            sourceAction: 'arunaos.ai',
          });
        }
        return;
      }

      if (detail.status === 'ready' && active.current) {
        active.current = false;
        lastPct.current = -1;
        hub.push({
          title: `${modelName} Ready`,
          body: 'Model downloaded. Running fully offline.',
          source: SOURCE,
          priority: 'normal',
          sourceAction: 'arunaos.ai',
        });
        return;
      }

      if (detail.status === 'error' && active.current) {
        active.current = false;
        lastPct.current = -1;
        hub.push({
          title: `${modelName} Failed`,
          body: detail.error ?? 'Unknown error',
          source: SOURCE,
          priority: 'high',
          sourceAction: 'arunaos.ai',
        });
        return;
      }
    };

    window.addEventListener('aruna-model-progress', handler as EventListener);
    return () => window.removeEventListener('aruna-model-progress', handler as EventListener);
  }, [engine, ready]);

  return null;
}
