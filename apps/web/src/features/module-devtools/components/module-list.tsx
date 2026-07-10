import { useState, useEffect } from 'react';
import type { ModuleRegistry, ModuleLoader, ModuleStore, ModuleStoreState } from '@arunaos/runtime';
import { useService } from '@/providers/service-provider';
import type { ModuleWindowService } from '@/services/module-window';

interface ModuleListProps {
  registry: ModuleRegistry;
  loader: ModuleLoader;
  store: ModuleStore;
}

export function ModuleList({ registry: _registry, loader, store }: ModuleListProps) {
  const [state, setState] = useState<ModuleStoreState>(store.getSnapshot());
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [errorLog, setErrorLog] = useState<
    Array<{ moduleId: string; message: string; time: Date }>
  >([]);
  const [successMsg, setSuccessMsg] = useState<{ moduleId: string; message: string } | null>(null);

  const moduleWindowService = useService<ModuleWindowService>('moduleWindow');

  useEffect(() => {
    return store.subscribe((s) => setState(s));
  }, [store]);

  const entries = state.entries;

  const flash = (msg: { moduleId: string; message: string }) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  const handleLoad = async (id: string) => {
    setLoading((prev) => new Set(prev).add(id));
    try {
      await loader.load(id);
      flash({ moduleId: id, message: 'Loaded successfully' });
    } catch (err) {
      setErrorLog((prev) => [...prev, { moduleId: id, message: String(err), time: new Date() }]);
    } finally {
      setLoading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleUnload = async (id: string) => {
    setLoading((prev) => new Set(prev).add(id));
    try {
      await loader.unload(id);
      flash({ moduleId: id, message: 'Unloaded' });
    } catch (err) {
      setErrorLog((prev) => [...prev, { moduleId: id, message: String(err), time: new Date() }]);
    } finally {
      setLoading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleReload = async (id: string) => {
    setLoading((prev) => new Set(prev).add(id));
    try {
      await loader.reload(id);
      flash({ moduleId: id, message: 'Reloaded' });
    } catch (err) {
      setErrorLog((prev) => [...prev, { moduleId: id, message: String(err), time: new Date() }]);
    } finally {
      setLoading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const statusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'text-green-400';
      case 'loading':
        return 'text-yellow-400';
      case 'suspended':
        return 'text-blue-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-white/40';
    }
  };

  const isLoading = (id: string) => loading.has(id);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 p-3">
        <h2 className="text-sm font-semibold text-white">Module DevTools</h2>
        <p className="text-xs text-white/40">{entries.length} modules registered</p>
      </div>

      <div className="flex-1 overflow-auto">
        {entries.length === 0 && (
          <div className="flex h-full items-center justify-center text-xs text-white/30">
            No modules registered
          </div>
        )}

        {successMsg && (
          <div className="mx-3 mt-2 rounded bg-green-500/15 px-3 py-1.5 text-[10px] text-green-400">
            [{successMsg.moduleId}] {successMsg.message}
          </div>
        )}

        {entries.map((entry) => (
          <div
            key={entry.manifest.id}
            className={`border-b border-white/5 px-3 py-2 text-xs transition-colors hover:bg-white/5 ${
              selected === entry.manifest.id ? 'bg-blue-500/10' : ''
            } ${isLoading(entry.manifest.id) ? 'opacity-60' : ''}`}
            onClick={() => setSelected(entry.manifest.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${statusColor(entry.status)}`} />
                <span className="font-medium text-white">{entry.manifest.name}</span>
                {isLoading(entry.manifest.id) && (
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-[1.5px] border-white/20 border-t-white/60" />
                )}
              </div>
              <span className="text-[10px] text-white/30">{entry.manifest.id}</span>
            </div>
            <div className="mt-1 flex gap-2">
              <span className="rounded bg-white/5 px-1 py-0.5 text-[10px] text-white/40">
                {entry.status}
              </span>
              <span className="rounded bg-white/5 px-1 py-0.5 text-[10px] text-white/40">
                v{entry.manifest.version}
              </span>
              {entry.error && (
                <span
                  className="rounded bg-red-500/10 px-1 py-0.5 text-[10px] text-red-400"
                  title={entry.error.message}
                >
                  error
                </span>
              )}
            </div>

            {selected === entry.manifest.id && (
              <div className="mt-2 flex gap-1">
                {entry.status !== 'active' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoad(entry.manifest.id);
                    }}
                    disabled={isLoading(entry.manifest.id)}
                    className="rounded bg-green-500/20 px-2 py-0.5 text-[10px] text-green-400 transition-colors hover:bg-green-500/30 disabled:opacity-40"
                  >
                    {isLoading(entry.manifest.id) ? 'Loading...' : 'Load'}
                  </button>
                )}
                {entry.status === 'active' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReload(entry.manifest.id);
                      }}
                      disabled={isLoading(entry.manifest.id)}
                      className="rounded bg-yellow-500/20 px-2 py-0.5 text-[10px] text-yellow-400 transition-colors hover:bg-yellow-500/30 disabled:opacity-40"
                    >
                      {isLoading(entry.manifest.id) ? 'Reloading...' : 'Reload'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnload(entry.manifest.id);
                      }}
                      disabled={isLoading(entry.manifest.id)}
                      className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-40"
                    >
                      {isLoading(entry.manifest.id) ? 'Unloading...' : 'Unload'}
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moduleWindowService.openModule(entry.manifest.id).catch(() => {});
                  }}
                  className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400 transition-colors hover:bg-blue-500/30"
                >
                  Open Window
                </button>
              </div>
            )}

            {selected === entry.manifest.id && entry.error && (
              <div className="mt-2 rounded bg-red-500/10 p-2 text-[10px] text-red-400">
                {entry.error.message}
              </div>
            )}
          </div>
        ))}
      </div>

      {errorLog.length > 0 && (
        <div className="border-t border-white/10">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[10px] font-medium text-white/40">Error Log</span>
            <button
              onClick={() => setErrorLog([])}
              className="text-[10px] text-blue-400 hover:text-blue-300"
            >
              Clear
            </button>
          </div>
          <div className="max-h-32 overflow-auto px-3 pb-2">
            {errorLog.map((err, i) => (
              <div key={i} className="py-0.5 text-[10px] text-red-400">
                <span className="text-white/30">{err.time.toLocaleTimeString()}</span> [
                {err.moduleId}] {err.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
