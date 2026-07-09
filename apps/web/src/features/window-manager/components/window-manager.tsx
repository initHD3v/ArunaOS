"use client";

import { useWindowStore } from "@/features/window-manager/stores/window.store";
import { Window } from "@/features/window-manager/components/window";
import { AnimatePresence } from "motion/react";

export function WindowManager() {
  const windows = useWindowStore((s) => s.windows);
  const windowList = Object.values(windows);

  return (
    <AnimatePresence>
      {windowList.map((win) => (
        <Window key={win.id} data={win} />
      ))}
    </AnimatePresence>
  );
}