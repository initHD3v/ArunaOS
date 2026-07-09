'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { create } from 'zustand';

interface ModalConfig {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'confirm' | 'prompt';
  defaultValue?: string;
  resolve: (value: unknown) => void;
}

interface ModalStore {
  stack: ModalConfig[];
  push: (m: ModalConfig) => void;
  pop: () => ModalConfig | undefined;
  remove: (id: string) => void;
  clear: () => void;
}

let modalId = 0;

const useModalStore = create<ModalStore>((set) => ({
  stack: [],
  push: (m) => set((s) => ({ stack: [...s.stack, m] })),
  pop: () => {
    let top: ModalConfig | undefined;
    set((s) => {
      top = s.stack[s.stack.length - 1];
      return { stack: s.stack.slice(0, -1) };
    });
    return top;
  },
  remove: (id) => set((s) => ({ stack: s.stack.filter((m) => m.id !== id) })),
  clear: () => set({ stack: [] }),
}));

export class ModalService {
  alert(title: string, message: string): Promise<void> {
    return new Promise((resolve) => {
      const id = `modal-${++modalId}`;
      useModalStore.getState().push({
        id,
        title,
        message,
        type: 'alert',
        resolve: () => resolve(),
      });
    });
  }

  confirm(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const id = `modal-${++modalId}`;
      useModalStore.getState().push({
        id,
        title,
        message,
        type: 'confirm',
        resolve: (val) => resolve(val === true),
      });
    });
  }

  prompt(title: string, message: string, defaultValue?: string): Promise<string | null> {
    return new Promise((resolve) => {
      const id = `modal-${++modalId}`;
      useModalStore.getState().push({
        id,
        title,
        message,
        type: 'prompt',
        defaultValue,
        resolve: (val) => resolve(typeof val === 'string' ? val : null),
      });
    });
  }

  closeAll(): void {
    const stack = useModalStore.getState().stack;
    for (const m of stack) {
      m.resolve(null);
    }
    useModalStore.getState().clear();
  }

  close(id: string): void {
    const stack = useModalStore.getState().stack;
    const modal = stack.find((m) => m.id === id);
    if (modal) {
      modal.resolve(null);
      useModalStore.getState().remove(id);
    }
  }
}

export function ModalRenderer() {
  const stack = useModalStore((s) => s.stack);
  const remove = useModalStore((s) => s.remove);
  const top = stack[stack.length - 1];

  const handleClose = useCallback(
    (id: string, value: unknown) => {
      const m = stack.find((x) => x.id === id);
      if (m) {
        m.resolve(value);
        remove(id);
      }
    },
    [stack, remove],
  );

  if (!top) return null;

  return (
    <AnimatePresence>
      {top && (
        <motion.div
          key={top.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/20 backdrop-blur-sm"
          onClick={() => {
            if (top.type === 'alert') handleClose(top.id, undefined);
          }}
        >
          <ModalDialog key={top.id} config={top} onClose={(value) => handleClose(top.id, value)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ModalDialog({
  config,
  onClose,
}: {
  config: ModalConfig;
  onClose: (value: unknown) => void;
}) {
  const [inputValue, setInputValue] = useState(config.defaultValue ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (config.type === 'prompt') {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    dialogRef.current?.focus();
  }, [config.type]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (config.type === 'alert') onClose(undefined);
        else onClose(null);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (config.type === 'alert') onClose(undefined);
        else if (config.type === 'confirm') onClose(true);
        else if (config.type === 'prompt') onClose(inputValue);
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [config.type, inputValue, onClose]);

  return (
    <motion.div
      ref={dialogRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      role="dialog"
      aria-modal="true"
      aria-label={config.title}
      tabIndex={-1}
      className="border-border/20 w-80 rounded-xl border bg-white/10 p-5 shadow-2xl backdrop-blur-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-foreground/90 mb-1 text-sm font-semibold">{config.title}</h2>
      <p className="text-foreground/60 mb-4 text-xs leading-relaxed">{config.message}</p>

      {config.type === 'prompt' && (
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="border-border/20 bg-foreground/5 text-foreground/80 mb-4 w-full rounded-lg border px-3 py-1.5 text-xs outline-none focus:border-blue-500/50"
          placeholder="..."
        />
      )}

      <div className="flex justify-end gap-2">
        {config.type !== 'alert' && (
          <button
            onClick={() => onClose(null)}
            className="text-foreground/50 hover:text-foreground/80 rounded-lg px-3 py-1.5 text-xs transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={() => {
            if (config.type === 'prompt') onClose(inputValue);
            else onClose(true);
          }}
          className="bg-foreground/10 hover:bg-foreground/20 text-foreground/80 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors"
        >
          {config.type === 'alert' ? 'OK' : 'Confirm'}
        </button>
      </div>
    </motion.div>
  );
}
