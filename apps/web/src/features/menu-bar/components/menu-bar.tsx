"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

function useTime() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(date: Date) {
  return date.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-5 w-5" />
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={cn(
        "flex items-center justify-center",
        "h-6 w-6 rounded-md",
        "text-muted-foreground hover:text-foreground",
        "hover:bg-muted transition-colors duration-150",
      )}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}

export function MenuBar() {
  const time = useTime();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "h-8 px-3",
        "flex items-center justify-between",
        "bg-background/30 backdrop-blur-xl",
        "border-b border-border/50",
        "select-none",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tracking-tight text-foreground/80">
          ArunaOS
        </span>
      </div>

      <div className="flex items-center gap-3">
        {mounted && (
          <span className="text-xs text-muted-foreground">
            {formatDate(time)}
          </span>
        )}
        <span className="text-xs font-medium tabular-nums text-foreground/70">
          {formatTime(time)}
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}