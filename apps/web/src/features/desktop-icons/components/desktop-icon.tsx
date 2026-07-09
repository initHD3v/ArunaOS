'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, FolderOpen, Settings } from 'lucide-react';
import type { DesktopIconData } from '@/types';

const iconMap: Record<string, React.ElementType> = {
  sparkles: Sparkles,
  folder: FolderOpen,
  settings: Settings,
};

interface DesktopIconProps {
  data: DesktopIconData;
  isSelected: boolean;
  isRenaming: boolean;
  onSelect: (id: string) => void;
  onDoubleClick: (data: DesktopIconData) => void;
  onRename: (id: string, title: string) => void;
  onRenameCancel: () => void;
}

export const DesktopIcon = memo(function DesktopIcon({
  data,
  isSelected,
  isRenaming,
  onSelect,
  onDoubleClick,
  onRename,
  onRenameCancel,
}: DesktopIconProps) {
  const Icon = iconMap[data.icon] ?? FolderOpen;
  const [editTitle, setEditTitle] = useState(data.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      setEditTitle(data.title);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isRenaming, data.title]);

  const finishRename = useCallback(() => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== data.title) {
      onRename(data.id, trimmed);
    } else {
      onRenameCancel();
    }
  }, [editTitle, data.id, data.title, onRename, onRenameCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        finishRename();
      } else if (e.key === 'Escape') {
        onRenameCancel();
      }
    },
    [finishRename, onRenameCancel],
  );

  const handleClick = useCallback(() => onSelect(data.id), [data.id, onSelect]);
  const handleDoubleClick = useCallback(() => onDoubleClick(data), [data, onDoubleClick]);

  const handleInputBlur = useCallback(() => {
    finishRename();
  }, [finishRename]);

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`flex w-20 cursor-default flex-col items-center gap-1.5 rounded-xl p-2 transition-colors duration-100 ${
        isSelected ? 'bg-primary/15 ring-primary/30 ring-1' : 'hover:bg-white/5'
      } `}
      aria-label={data.title}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
        <Icon size={24} className="text-foreground/80" strokeWidth={1.5} />
      </div>
      {isRenaming ? (
        <input
          ref={inputRef}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleInputBlur}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          className="bg-background/80 border-primary/40 text-foreground w-full rounded border px-1 py-0.5 text-center text-[11px] font-medium outline-none"
        />
      ) : (
        <span className="text-foreground/70 max-w-full break-words px-1 text-center text-[11px] font-medium leading-tight">
          {data.title}
        </span>
      )}
    </motion.button>
  );
});
