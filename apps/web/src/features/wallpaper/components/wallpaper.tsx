"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function generateGradient(theme: string | undefined) {
  if (theme === "dark") {
    return "radial-gradient(ellipse at top, #1a1a2e 0%, #0a0a0a 100%)";
  }
  return "radial-gradient(ellipse at top, #e0e7ff 0%, #ffffff 100%)";
}

export function Wallpaper() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 -z-10 bg-background" />
    );
  }

  return (
    <div
      className="fixed inset-0 -z-10"
      style={{ background: generateGradient(theme) }}
    >
      <div
        className={cn(
          "absolute inset-0",
          "bg-gradient-to-b from-transparent via-background/5 to-background/40",
        )}
      />
    </div>
  );
}