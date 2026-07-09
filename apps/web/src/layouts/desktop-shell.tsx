"use client";

import type { ReactNode } from "react";
import { Wallpaper } from "@/features/wallpaper/components/wallpaper";
import { MenuBar } from "@/features/menu-bar/components/menu-bar";
import { Dock } from "@/features/dock/components/dock";

export function DesktopShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Wallpaper />
      <MenuBar />
      <main className="h-full w-full pt-8 pb-20">
        {children}
      </main>
      <Dock />
      <div id="portal-root" />
    </div>
  );
}