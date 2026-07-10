'use client';

import { useState, useEffect } from 'react';
import { useService } from '@/providers/service-provider';
import { useWindowStore } from '@/features/window-manager/stores/window.store';
import type { ModuleRegistry, ModuleLoader, ModuleStore } from '@arunaos/runtime';
import { ModuleList } from './components/module-list';

function WindowSwitchDebug() {
  const [windows, setWindows] = useState<Record<string, { id: string; title: string }>>({});
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const refresh = () => {
    const state = useWindowStore.getState();
    const entries: Record<string, { id: string; title: string }> = {};
    for (const [id, win] of Object.entries(state.windows)) {
      entries[id] = { id, title: win.title };
    }
    setWindows(entries);
    setFocusedId(state.focusedWindowId);
  };

  useEffect(() => {
    refresh();
    const unsub = useWindowStore.subscribe(refresh);
    return unsub;
  }, []);

  const switchForward = () => {
    const ws = useWindowStore.getState();
    const ids = Object.keys(ws.windows);
    if (ids.length <= 1) return;
    const currentIdx = ws.focusedWindowId ? ids.indexOf(ws.focusedWindowId) : -1;
    const nextIdx = (currentIdx + 1) % ids.length;
    const nextId = ids[nextIdx === -1 ? 0 : nextIdx];
    if (nextId) ws.focusWindow(nextId);
  };

  const switchBackward = () => {
    const ws = useWindowStore.getState();
    const ids = Object.keys(ws.windows);
    if (ids.length <= 1) return;
    const currentIdx = ws.focusedWindowId ? ids.indexOf(ws.focusedWindowId) : -1;
    const prevIdx = currentIdx <= 0 ? ids.length - 1 : currentIdx - 1;
    const prevId = ids[prevIdx];
    if (prevId) ws.focusWindow(prevId);
  };

  const windowCount = Object.keys(windows).length;

  return (
    <div className="border-b border-white/10 p-3">
      <h3 className="mb-2 text-xs font-semibold text-white/60">Window Switch Debug</h3>
      <div className="mb-1.5 flex items-center gap-2">
        <button
          onClick={switchForward}
          disabled={windowCount < 2}
          className="rounded bg-blue-500/20 px-3 py-1 text-xs text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-30"
        >
          Forward
        </button>
        <button
          onClick={switchBackward}
          disabled={windowCount < 2}
          className="rounded bg-blue-500/20 px-3 py-1 text-xs text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-30"
        >
          Backward
        </button>
        <span className="text-[10px] text-white/30">{windowCount} window(s)</span>
        <button onClick={refresh} className="ml-auto text-[10px] text-blue-400 hover:text-blue-300">
          refresh
        </button>
      </div>
      {windowCount > 0 && (
        <div className="space-y-0.5">
          {Object.values(windows).map((w) => (
            <div
              key={w.id}
              className={`flex items-center gap-2 rounded px-2 py-0.5 text-[10px] ${
                w.id === focusedId ? 'bg-blue-500/15 text-blue-300' : 'text-white/40'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              <span className="truncate">{w.title}</span>
              <span className="ml-auto font-mono text-white/20">{w.id.slice(0, 20)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ModuleDevtools() {
  const registry = useService<ModuleRegistry>('moduleRegistry');
  const loader = useService<ModuleLoader>('moduleLoader');
  const store = useService<ModuleStore>('moduleStore');

  return (
    <div className="flex h-full w-full flex-col bg-black text-white">
      <WindowSwitchDebug />
      <div className="flex-1 overflow-hidden">
        <ModuleList registry={registry} loader={loader} store={store} />
      </div>
    </div>
  );
}
