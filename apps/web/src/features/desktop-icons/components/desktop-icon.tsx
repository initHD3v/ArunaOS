"use client";

import { memo, useCallback } from "react";
import { motion } from "motion/react";
import { Sparkles, FolderOpen, Settings } from "lucide-react";
import type { DesktopIconData } from "@/types";

const iconMap: Record<string, React.ElementType> = {
  sparkles: Sparkles,
  folder: FolderOpen,
  settings: Settings,
};

interface DesktopIconProps {
  data: DesktopIconData;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDoubleClick: (data: DesktopIconData) => void;
}

export const DesktopIcon = memo(function DesktopIcon({
  data,
  isSelected,
  onSelect,
  onDoubleClick,
}: DesktopIconProps) {
  const Icon = iconMap[data.icon] ?? FolderOpen;

  const handleClick = useCallback(() => onSelect(data.id), [data.id, onSelect]);
  const handleDoubleClick = useCallback(() => onDoubleClick(data), [data, onDoubleClick]);

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`
        flex flex-col items-center gap-1.5 p-2 rounded-xl cursor-default
        w-20 transition-colors duration-100
        ${isSelected
          ? "bg-primary/15 ring-1 ring-primary/30"
          : "hover:bg-white/5"}
      `}
      aria-label={data.title}
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm">
        <Icon size={24} className="text-foreground/80" strokeWidth={1.5} />
      </div>
      <span className="text-[11px] font-medium text-foreground/70 text-center leading-tight px-1">
        {data.title}
      </span>
    </motion.button>
  );
});