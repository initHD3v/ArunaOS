"use client";

import { useCallback } from "react";
import { DesktopShell } from "@/layouts/desktop-shell";
import { DesktopGrid } from "@/features/desktop-icons/components/desktop-grid";
import { Selection } from "@/features/selection/components/selection";
import { useUIStore } from "@/stores/ui-store";

const desktopMenuItems = [
  { id: "new-folder", label: "New Folder", action: () => {} },
  { id: "sep1", label: "", action: () => {}, separator: true },
  { id: "refresh", label: "Refresh", action: () => {} },
  { id: "sep2", label: "", action: () => {}, separator: true },
  { id: "wallpaper", label: "Change Wallpaper", action: () => {} },
  { id: "sep3", label: "", action: () => {}, separator: true },
  { id: "settings", label: "Settings", action: () => {} },
];

export default function Home() {
  const showContextMenu = useUIStore((s) => s.showContextMenu);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      showContextMenu({ x: e.clientX, y: e.clientY }, desktopMenuItems);
    },
    [showContextMenu],
  );

  return (
    <DesktopShell>
      <div className="relative h-full w-full" onContextMenu={handleContextMenu}>
        <Selection />
        <DesktopGrid />
      </div>
    </DesktopShell>
  );
}