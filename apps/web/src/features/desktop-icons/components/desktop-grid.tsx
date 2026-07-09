"use client";

import { memo } from "react";
import { DesktopIcon } from "@/features/desktop-icons/components/desktop-icon";
import { useDesktopStore } from "@/features/desktop/stores/desktop.store";
import { useWindowStore } from "@/features/window-manager/stores/window.store";
import type { DesktopIconData } from "@/types";

function createWindowFromIcon(data: DesktopIconData) {
  const id = `window-${data.id}-${Date.now()}`;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  return {
    id,
    title: data.title,
    icon: data.icon,
    appId: data.appId,
    position: {
      x: Math.max(40, (viewportWidth - 960) / 2 + Math.random() * 80),
      y: Math.max(40, (viewportHeight - 640) / 2 + Math.random() * 40),
    },
    size: { width: 960, height: 640 },
    zIndex: 1,
    state: "active" as const,
  };
}

export const DesktopGrid = memo(function DesktopGrid() {
  const icons = useDesktopStore((s) => s.icons);
  const selectedIconId = useDesktopStore((s) => s.selectedIconId);
  const setSelectedIcon = useDesktopStore((s) => s.setSelectedIcon);
  const openWindow = useWindowStore((s) => s.openWindow);

  const handleDoubleClick = (data: DesktopIconData) => {
    const win = createWindowFromIcon(data);
    openWindow(win);
  };

  return (
    <div
      className="flex flex-wrap content-start gap-2 p-4 pt-6"
      style={{ maxWidth: 96 * 4 + 32 }}
    >
      {icons.map((icon) => (
        <DesktopIcon
          key={icon.id}
          data={icon}
          isSelected={selectedIconId === icon.id}
          onSelect={setSelectedIcon}
          onDoubleClick={handleDoubleClick}
        />
      ))}
    </div>
  );
});