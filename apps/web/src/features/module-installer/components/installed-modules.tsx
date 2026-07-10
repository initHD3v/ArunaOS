'use client';

import { useState, useEffect } from 'react';
import type { ModuleStore, ModuleStoreState } from '@arunaos/runtime';

interface InstalledModulesProps {
  store: ModuleStore;
  onOpenModule: (moduleId: string) => void;
}

export function InstalledModules({ store, onOpenModule }: InstalledModulesProps) {
  const [state, setState] = useState<ModuleStoreState>(store.getSnapshot());
  const [filter, setFilter] = useState('');

  useEffect(() => {
    return store.subscribe((s) => setState(s));
  }, [store]);

  const entries = state.entries
    .filter((e) => e.manifest.type !== 'system')
    .filter((e) => !filter || e.manifest.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 p-3">
        <h2 className="text-sm font-semibold text-white">Module Installer</h2>
        <p className="text-xs text-white/40">Browse and manage installed modules</p>
      </div>

      <div className="border-b border-white/10 px-3 py-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search modules..."
          className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white placeholder-white/30 outline-none ring-0 focus:bg-white/15"
        />
      </div>

      <div className="flex-1 overflow-auto">
        {entries.length === 0 && (
          <div className="flex h-full items-center justify-center text-xs text-white/30">
            {filter ? 'No modules match your search' : 'No modules installed'}
          </div>
        )}

        {entries.map((entry) => (
          <div
            key={entry.manifest.id}
            className="flex items-center justify-between border-b border-white/5 px-3 py-2.5 transition-colors hover:bg-white/5"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm">
                {entry.manifest.icon === 'folder' && '📁'}
                {entry.manifest.icon === 'settings' && '⚙️'}
                {entry.manifest.icon === 'activity' && '📊'}
                {entry.manifest.icon === 'camera' && '📷'}
                {entry.manifest.icon === 'sparkles' && '✨'}
                {!['folder', 'settings', 'activity', 'camera', 'sparkles'].includes(
                  entry.manifest.icon,
                ) && '🧩'}
              </span>
              <div>
                <div className="text-xs font-medium text-white">{entry.manifest.name}</div>
                <div className="text-[10px] text-white/40">
                  {entry.manifest.description} &middot; v{entry.manifest.version}
                </div>
                <div className="mt-0.5 flex gap-1">
                  {entry.manifest.permissions?.map((p) => (
                    <span
                      key={p}
                      className="rounded bg-white/5 px-1 py-0.5 text-[8px] text-white/30"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => onOpenModule(entry.manifest.id)}
              className="rounded bg-blue-500/20 px-2.5 py-1 text-[10px] text-blue-400 transition-colors hover:bg-blue-500/30"
            >
              Open
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
