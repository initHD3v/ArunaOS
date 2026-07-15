import { useCallback, useEffect, useRef, useState } from 'react';
import { AICommandBar } from './ai-command-bar';
import { useAIContextStore } from '@/stores/ai-context.store';

export function AICommandBarProvider() {
  const [open, setOpen] = useState(false);
  const openRef = useRef(open);
  openRef.current = open;

  const quickAskOpen = useAIContextStore((s) => s.quickAsk.open);

  useEffect(() => {
    if (quickAskOpen) {
      setOpen(true);
      useAIContextStore.getState().closeQuickAsk();
    }
  }, [quickAskOpen]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'i') {
      e.preventDefault();
      setOpen((p) => !p);
    }
    if (e.key === 'Escape' && openRef.current) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleClose = useCallback(() => setOpen(false), []);

  return <AICommandBar open={open} onClose={handleClose} />;
}
