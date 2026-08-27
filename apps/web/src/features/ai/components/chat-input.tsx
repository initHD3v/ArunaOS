'use client';

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled: boolean;
  placeholder?: string;
  aiHealth?: 'full' | 'limited' | 'none';
}

export function ChatInput({ onSend, onStop, disabled, placeholder, aiHealth }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const dynamicPlaceholder =
    placeholder ??
    (aiHealth === 'limited'
      ? 'Offline — jawaban terbatas pada alat lokal'
      : aiHealth === 'none'
        ? 'Atur AI di Settings untuk mulai'
        : 'Tanya apa saja ke AI...');

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    }
  };

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-border/20 border-t p-3 pb-2">
      <div
        className={cn(
          'bg-card flex items-end gap-1 rounded-2xl border px-3 py-2 transition-shadow',
          'border-border/30 focus-within:border-primary/40 shadow-sm focus-within:shadow-md',
          disabled && 'opacity-60',
        )}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder={dynamicPlaceholder}
          disabled={disabled}
          rows={1}
          className={cn(
            'max-h-[140px] min-h-[24px] flex-1 resize-none bg-transparent py-1 text-sm outline-none',
            'text-foreground placeholder:text-foreground/35',
          )}
        />
        <button
          type={disabled && onStop ? 'button' : 'submit'}
          onClick={disabled && onStop ? onStop : undefined}
          disabled={disabled && !onStop ? true : !disabled && !input.trim()}
          title={disabled && onStop ? 'Stop generating' : 'Send'}
          className={cn(
            'mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors',
            disabled && onStop
              ? 'bg-danger/15 text-danger hover:bg-danger/25'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40',
          )}
        >
          {disabled && onStop ? (
            <span className="h-2.5 w-2.5 rounded-[3px] bg-current" />
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14M12 5l7 7-7 7"
              />
            </svg>
          )}
        </button>
      </div>
      <p className="text-foreground/40 mt-1.5 hidden select-none text-center text-[10px] sm:block">
        ↵ Kirim · ⇧↵ Baris baru
      </p>
    </form>
  );
}
