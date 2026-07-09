'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Command } from 'lucide-react';
import type { Searchable } from '@/services/search/search-service';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  search: (q: string) => Searchable[];
  onSelect: (item: Searchable) => void;
  recentItems?: Searchable[];
}

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
          className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/20 pt-[15vh] backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="border-border/20 w-full max-w-lg overflow-hidden rounded-2xl border bg-white/10 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            <div className="border-border/10 flex items-center gap-2 border-b px-4 py-3">
              <Search size={16} className="text-foreground/30 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIdx(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search modules, settings, actions..."
                className="bg-transparent text-sm text-white/80 outline-none placeholder:text-white/20"
                aria-autocomplete="list"
                aria-controls="command-palette-list"
              />
              <kbd className="text-foreground/20 ml-auto shrink-0 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px]">
                <Command size={10} className="inline" />K
              </kbd>
            </div>

            {results.length > 0 && (
              <div
                id="command-palette-list"
                role="listbox"
                className="max-h-72 overflow-y-auto py-1"
                aria-label="Search results"
              >
                {!query.trim() && recentItems && recentItems.length > 0 && (
                  <div className="text-foreground/20 px-4 py-1 text-[10px] font-medium uppercase tracking-wider">
                    Recent
                  </div>
                )}
                {results.map((item, i) => (
                  <button
                    key={`${item.id}-${i}`}
                    role="option"
                    aria-selected={i === selectedIdx}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                      i === selectedIdx
                        ? 'bg-white/10 text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                    }`}
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIdx(i)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{item.label}</div>
                      {item.description && (
                        <div className="text-foreground/30 truncate text-[11px]">
                          {item.description}
                        </div>
                      )}
                    </div>
                    {item.category && (
                      <span className="text-foreground/20 shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px]">
                        {item.category}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {query.trim() && results.length === 0 && (
              <div className="text-foreground/30 px-4 py-6 text-center text-xs">
                No results for &ldquo;{query}&rdquo;
              </div>
            )}

            {!query.trim() && (!recentItems || recentItems.length === 0) && (
              <div className="text-foreground/20 px-4 py-6 text-center text-xs">
                Type to search...
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
