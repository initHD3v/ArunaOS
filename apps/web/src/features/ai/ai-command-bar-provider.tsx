'use client';

import { useCallback, useEffect, useState } from 'react';
import { AICommandBar } from './ai-command-bar';
import { useAIContextStore } from '@/stores/ai-context.store';

export function AICommandBarProvider() {
  const [open, setOpen] = useState(false);
  const quickAsk = useAIContextStore((s) => s.quickAsk);

  // Open when AI context action triggers
  useEffect(() => {
    if (quickAsk.open) setOpen(true);
  }, [quickAsk.open]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'i') {
        e.preventDefault();
        setOpen((p) => !p);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    },
    [open],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return <AICommandBar open={open} onClose={() => setOpen(false)} />;
}
