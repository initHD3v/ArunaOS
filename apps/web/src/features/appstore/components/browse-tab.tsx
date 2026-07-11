'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { RegistryClient } from '@arunaos/runtime';
import type { RegistryModuleInfo } from '@arunaos/runtime';
import { Search, Download, Shield, X, Loader2, Star } from 'lucide-react';

interface BrowseTabProps {
  onInstall: (manifestUrl: string) => void;
}

export function BrowseTab({ onInstall }: BrowseTabProps) {
  const [registry] = useState(() => new RegistryClient());
  const [query, setQuery] = useState('');
  const [modules, setModules] = useState<RegistryModuleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    registry
      .search({ query: query || undefined })
      .then((res) => setModules(res.modules ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [query, registry]);

  return (
    <div className="flex flex-col">
      <div className="relative px-4 pb-1 pt-3">
        <Search size={14} className="text-foreground/30 absolute left-6 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search modules..."
          className="border-border/20 bg-foreground/[0.03] text-foreground placeholder:text-foreground/30 w-full rounded-xl border py-2.5 pl-9 pr-9 text-xs focus:border-blue-500/40 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="text-foreground/30 hover:text-foreground/50 absolute right-5 top-1/2 -translate-y-1/2"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {loading && (
        <div className="flex h-full items-center justify-center py-20">
          <Loader2 size={18} className="text-foreground/30 animate-spin" />
        </div>
      )}

      {error && (
        <div className="mx-4 mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {!loading && modules.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-20">
          <Search size={32} className="text-foreground/15" />
          <p className="text-foreground/40 text-sm">
            {query ? `No modules found for "${query}"` : 'Browse the registry to discover modules'}
          </p>
        </div>
      )}

      {!loading && modules.length > 0 && (
        <div className="space-y-1.5 p-4">
          {modules.map((mod) => {
            const isInstalling = installing === mod.id;
            return (
              <div
                key={mod.id}
                className="border-border/20 bg-foreground/[0.02] hover:border-border/40 hover:bg-foreground/[0.04] flex items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 to-purple-500/15 text-blue-400">
                  <Star size={16} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground text-sm font-medium">{mod.name}</span>
                    <span className="text-foreground/40 text-[11px]">v{mod.version}</span>
                    {mod.verified && (
                      <span className="flex items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">
                        <Shield size={9} />
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-foreground/40 mt-0.5 line-clamp-2 text-xs leading-relaxed">
                    {mod.description}
                  </p>
                  <div className="text-foreground/30 mt-1.5 flex items-center gap-2 text-[10px]">
                    {mod.author && <span>{mod.author}</span>}
                    <span>{mod.downloads.toLocaleString()} downloads</span>
                    {'bundleSize' in mod && mod.bundleSize && (
                      <span>{(mod.bundleSize / 1024).toFixed(0)} KB</span>
                    )}
                  </div>
                </div>

                <button
                  disabled={isInstalling}
                  onClick={() => {
                    setInstalling(mod.id);
                    if (mod.manifestUrl) onInstall(mod.manifestUrl);
                  }}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                    isInstalling
                      ? 'bg-blue-500/10 text-blue-400/50'
                      : 'bg-blue-500 text-white shadow-sm hover:bg-blue-600 hover:shadow-md',
                  )}
                >
                  {isInstalling ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Download size={12} />
                  )}
                  {isInstalling ? 'Installing...' : 'Install'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
