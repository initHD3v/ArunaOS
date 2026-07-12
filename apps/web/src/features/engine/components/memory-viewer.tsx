'use client';

import { useState } from 'react';
import { useArunaEngine } from '@/features/engine/engine-context';
import { Eye, EyeOff } from 'lucide-react';

export function MemoryViewer() {
  const { engine } = useArunaEngine();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-foreground/30 hover:text-foreground/60 flex items-center gap-1.5 text-[10px] transition-colors"
      >
        {open ? <EyeOff size={10} /> : <Eye size={10} />}
        Memory
      </button>
      {open && (
        <div className="border-border/20 text-foreground/50 mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border bg-black/10 p-2 font-mono text-[9px]">
          {engine ? (
            <>
              <p>Status: {engine.getStatus()}</p>
              <p>Engine: ArunaEngine v1</p>
              <p>Proactive: balanced</p>
              <p>Modules: habit-learner, scheduler, pipeline, observer</p>
            </>
          ) : (
            <p>Engine not initialized</p>
          )}
        </div>
      )}
    </div>
  );
}
