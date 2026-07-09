"use client";

import { motion } from "motion/react";
import {
  Monitor,
  Sparkles,
  FolderOpen,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const dockItems = [
  { id: "finder", icon: Monitor, label: "Finder" },
  { id: "ai", icon: Sparkles, label: "AI" },
  { id: "files", icon: FolderOpen, label: "Files" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export function Dock() {
  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "flex items-end gap-1",
        "px-3 py-2",
        "rounded-2xl",
        "bg-background/20 backdrop-blur-2xl",
        "border border-border/30",
        "shadow-lg shadow-black/5",
      )}
    >
      {dockItems.map((item) => (
        <motion.button
          key={item.id}
          whileHover={{ scale: 1.15, y: -4 }}
          whileTap={{ scale: 0.95 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 25,
          }}
          className={cn(
            "flex flex-col items-center gap-1",
            "px-3 py-1.5",
            "rounded-xl",
            "hover:bg-white/10 dark:hover:bg-white/10",
            "transition-colors duration-150",
            "cursor-default",
          )}
          aria-label={item.label}
        >
          <item.icon
            size={22}
            className="text-foreground/80 drop-shadow-sm"
            strokeWidth={1.5}
          />
          <span className="text-[10px] font-medium text-foreground/60">
            {item.label}
          </span>
        </motion.button>
      ))}
    </div>
  );
}