'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { DesktopIconData } from '@/types';
import { getIcon } from '@/lib/icon-mapping';
import { useIsMobile } from '@/hooks/use-media-query';

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
  const isMobile = useIsMobile();
  const Icon = getIcon(data.icon);
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

  const iconSize = isMobile ? 28 : 24;
  const iconContainerSize = isMobile ? 'h-14 w-14' : 'h-12 w-12';
  const outerWidth = isMobile ? 'w-24' : 'w-20';

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onTouchEnd={(e) => {
        e.preventDefault();
        handleClick();
      }}
      className={`flex ${outerWidth} cursor-default flex-col items-center gap-1.5 rounded-xl p-2 transition-colors duration-100 hover:bg-white/5 ${
        isSelected ? 'bg-primary/15 ring-primary/30 ring-1' : ''
      } `}
      aria-label={data.title}
    >
      <div
        className={`flex ${iconContainerSize} items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm transition-transform duration-100 active:scale-95`}
      >
        <Icon size={iconSize} className="text-foreground/80" strokeWidth={1.5} />
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
    </div>
  );
});
