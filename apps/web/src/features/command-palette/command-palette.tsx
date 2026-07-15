'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Command, Monitor, Settings, Terminal, FileText, Sparkles } from 'lucide-react';
import { useAIContextStore } from '@/stores/ai-context.store';
import type { Searchable } from '@/services/search/search-service';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  search: (q: string) => Searchable[];
  onSelect: (item: Searchable) => void;
  recentItems?: Searchable[];
}

const categoryIcons: Record<string, React.ElementType> = {
  Module: Monitor,
  Action: Settings,
  Setting: Settings,
  App: Terminal,
  File: FileText,
};

const defaultIcon = Search;

export function CommandPalette({
  open,
  onClose,
  search,
  onSelect,
  recentItems,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo(() => {
    if (!open) return [];
    if (query.trim()) return search(query);
    return recentItems ?? [];
  }, [open, query, search, recentItems]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current || results.length === 0) return;
    const items = listRef.current.querySelectorAll('[data-result-item]');
    const selected = items[selectedIdx] as HTMLElement | undefined;
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx, results.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIdx((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIdx]) {
            onSelect(results[selectedIdx]);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results, selectedIdx, onSelect, onClose],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/40 pt-[12vh] backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 shadow-2xl shadow-black/30 backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3.5">
              <Search size={16} className="shrink-0 text-white/30" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIdx(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search modules, settings, actions..."
                className="min-w-0 flex-1 bg-transparent text-sm text-white/80 outline-none placeholder:text-white/20"
                aria-autocomplete="list"
                aria-controls="command-palette-list"
              />
              <kbd className="ml-auto shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/20">
                <Command size={10} className="inline" />K
              </kbd>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div
                id="command-palette-list"
                ref={listRef}
                role="listbox"
                className="max-h-80 overflow-y-auto py-1.5"
                aria-label="Search results"
              >
                {!query.trim() && recentItems && recentItems.length > 0 && (
                  <div className="px-4 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-white/20">
                    Recent
                  </div>
                )}
                {results.map((item, i) => {
                  const Icon = categoryIcons[item.category ?? ''] ?? defaultIcon;
                  return (
                    <button
                      key={`${item.id}-${i}`}
                      data-result-item
                      role="option"
                      aria-selected={i === selectedIdx}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                        i === selectedIdx
                          ? 'bg-white/10 text-white'
                          : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                      }`}
                      onClick={() => {
                        onSelect(item);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIdx(i)}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5">
                        <Icon size={14} className="text-white/40" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{item.label}</div>
                        {item.description && (
                          <div className="truncate text-[11px] text-white/30">
                            {item.description}
                          </div>
                        )}
                      </div>
                      {item.category && (
                        <span className="shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-white/25">
                          {item.category}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* AI fallback when no results */}
            {query.trim() && results.length === 0 && (
              <div>
                <button
                  onClick={() => {
                    useAIContextStore.getState().askAI(query);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/5"
                >
                  <div className="bg-primary/10 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
                    <Sparkles size={14} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-white/80">
                      Ask AI about &ldquo;{query}&rdquo;
                    </div>
                    <div className="truncate text-[11px] text-white/30">
                      Use AI to answer your question
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-white/25">
                    AI
                  </span>
                </button>
                <div className="px-4 py-2 text-center text-[10px] text-white/20">
                  No indexed results for &ldquo;{query}&rdquo;
                </div>
              </div>
            )}

            {!query.trim() && (!recentItems || recentItems.length === 0) && (
              <div className="px-4 py-8 text-center text-xs text-white/25">Type to search...</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
