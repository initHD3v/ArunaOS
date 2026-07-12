'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useService } from '@/providers/service-provider';
import { ExternalModuleLoader, SecurityRatingSystem } from '@arunaos/runtime';
import type {
  ExternalModuleEntry,
  ExternalModuleManifest,
  SecurityScore,
  ModuleRegistry,
  ModuleEntry,
} from '@arunaos/runtime';
import {
  Package,
  Upload,
  HardDrive,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  FileCode,
  Grid3X3,
  Globe,
  Download,
} from 'lucide-react';
import { BrowseTab } from './browse-tab';
import { InstallProgress, type InstallStep } from './install-progress';

const TABS = [
  { id: 'browse', label: 'Browse', icon: Grid3X3 },
  { id: 'install-url', label: 'From URL', icon: Globe },
  { id: 'installed', label: 'Installed', icon: Package },
  { id: 'offline', label: 'Offline Install', icon: HardDrive },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function AppStore() {
  const [activeTab, setActiveTab] = useState<TabId>('browse');
  const [installed, setInstalled] = useState<ExternalModuleEntry[]>([]);
  const [loadingInstalled] = useState(false);
  const [installProgress, setInstallProgress] = useState<{
    visible: boolean;
    title: string;
    subtitle: string;
    steps: InstallStep[];
    type: 'install' | 'uninstall';
  } | null>(null);
  const [offlineResetKey, setOfflineResetKey] = useState(0);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    if (highlightedId) {
      const timer = setTimeout(() => setHighlightedId(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [highlightedId]);

  const externalLoader = useService<ExternalModuleLoader>('externalModuleLoader');
  const moduleRegistry = useService<ModuleRegistry>('moduleRegistry');
  const securityRating = useService<SecurityRatingSystem>('securityRating');

  const [builtinEntries, setBuiltinEntries] = useState<ModuleEntry[]>([]);

  const refreshInstalled = useCallback(() => {
    const ext = externalLoader.getInstalledModules();
    setInstalled(ext);
    const all = moduleRegistry.getAll();
    setBuiltinEntries(
      all.filter((e) => e.manifest.type !== 'external' && e.manifest.type !== 'system'),
    );
  }, [externalLoader, moduleRegistry]);

  useEffect(() => {
    refreshInstalled();
  }, [refreshInstalled]);

  const installModule = async (manifestUrl: string, entry: ExternalModuleEntry | null = null) => {
    const steps: InstallStep[] = [
      { id: 'fetch', label: 'Fetching module manifest', status: 'pending' },
      { id: 'verify', label: 'Verifying manifest integrity', status: 'pending' },
      { id: 'download', label: 'Downloading module bundle', status: 'pending' },
      { id: 'checksum', label: 'Verifying integrity checksum', status: 'pending' },
      { id: 'register', label: 'Registering module in system', status: 'pending' },
      { id: 'finalize', label: 'Finalizing installation', status: 'pending' },
    ];

    setInstallProgress({
      visible: true,
      title: 'Installing Module',
      subtitle: entry?.manifest.name ?? manifestUrl,
      steps,
      type: 'install',
    });

    try {
      steps[0]!.status = 'running';
      steps[0]!.detail = manifestUrl;
      setInstallProgress((p) => (p ? { ...p, steps: [...steps] } : p));
      await sleep(300);

      const res = await fetch(manifestUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const raw = await res.json();

      steps[0]!.status = 'done';
      steps[0]!.detail = 'Manifest fetched successfully';
      steps[1]!.status = 'running';
      steps[1]!.detail = `Validating module: ${raw.id ?? 'unknown'}`;
      setInstallProgress((p) => (p ? { ...p, steps: [...steps] } : p));
      await sleep(400);

      if (!raw.manifestUrl) {
        raw.manifestUrl = manifestUrl;
      }
      const validated: ExternalModuleManifest = externalLoader.validateManifest(raw);
      const score: SecurityScore = await securityRating.analyze(validated, {
        checksumVerified: false,
        source: 'url',
      });

      steps[1]!.status = 'done';
      steps[1]!.detail = `${validated.id} v${validated.version} — ${score.level}`;
      steps[2]!.status = 'running';
      steps[2]!.detail = validated.entry;
      setInstallProgress((p) => (p ? { ...p, steps: [...steps] } : p));
      await sleep(300);

      for (let progress = 0; progress <= 100; progress += 10) {
        steps[2]!.progress = progress;
        setInstallProgress((p) => (p ? { ...p, steps: [...steps] } : p));
        await sleep(80);
      }
      steps[2]!.status = 'done';
      steps[2]!.detail = 'Bundle downloaded';
      steps[3]!.status = 'running';
      steps[3]!.detail = `SHA-256: ${validated.checksum.slice(0, 16)}...`;
      setInstallProgress((p) => (p ? { ...p, steps: [...steps] } : p));
      await sleep(500);

      const result = await externalLoader.installFromUrl(manifestUrl);
      steps[3]!.status = 'done';
      steps[3]!.detail = 'Checksum verified';
      steps[4]!.status = 'running';
      steps[4]!.detail = `Module ID: ${result.entry.id}`;
      setInstallProgress((p) => (p ? { ...p, steps: [...steps] } : p));
      await sleep(300);

      steps[4]!.status = 'done';
      steps[5]!.status = 'running';
      steps[5]!.detail = `Bundle size: ${(result.entry.bundleSize / 1024).toFixed(1)} KB`;
      setInstallProgress((p) => (p ? { ...p, steps: [...steps] } : p));
      await sleep(400);

      steps[5]!.status = 'done';
      setInstallProgress((p) => (p ? { ...p, steps: [...steps] } : p));
      refreshInstalled();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const current = [...steps];
      const runningIdx = current.findIndex((s) => s.status === 'running');
      if (runningIdx >= 0) {
        current[runningIdx] = { ...current[runningIdx]!, status: 'error', detail: errorMsg };
      }
      setInstallProgress((p) => (p ? { ...p, steps: current } : p));
    }
  };

  const uninstallModule = async (entry: ExternalModuleEntry) => {
    const steps: InstallStep[] = [
      { id: 'unregister', label: 'Unregistering module', status: 'pending' },
      { id: 'cleanup', label: 'Cleaning up module data', status: 'pending' },
      { id: 'remove', label: 'Removing module files', status: 'pending' },
    ];

    setInstallProgress({
      visible: true,
      title: 'Uninstalling Module',
      subtitle: `${entry.manifest.name} v${entry.manifest.version}`,
      steps,
      type: 'uninstall',
    });

    try {
      steps[0]!.status = 'running';
      steps[0]!.detail = `Module: ${entry.id}`;
      setInstallProgress((p) => (p ? { ...p, steps: [...steps] } : p));
      await sleep(400);

      await externalLoader.uninstall(entry.id);

      steps[0]!.status = 'done';
      steps[0]!.detail = `${entry.id} unregistered`;
      steps[1]!.status = 'running';
      steps[1]!.detail = 'Removing cached data...';
      setInstallProgress((p) => (p ? { ...p, steps: [...steps] } : p));
      await sleep(300);

      steps[1]!.status = 'done';
      steps[2]!.status = 'running';
      steps[2]!.detail = 'Bundle removed from cache';
      setInstallProgress((p) => (p ? { ...p, steps: [...steps] } : p));
      await sleep(300);

      steps[2]!.status = 'done';
      setInstallProgress((p) => (p ? { ...p, steps: [...steps] } : p));
      refreshInstalled();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const current = [...steps];
      const runningIdx = current.findIndex((s) => s.status === 'running');
      if (runningIdx >= 0) {
        current[runningIdx] = { ...current[runningIdx]!, status: 'error', detail: errorMsg };
      }
      setInstallProgress((p) => (p ? { ...p, steps: current } : p));
    }
  };

  const offlineInstall = async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      if (!file.name.endsWith('.json')) continue;

      try {
        const content = await file.text();
        const parsed = JSON.parse(content);
        if (!parsed.manifestUrl) {
          parsed.manifestUrl = 'http://offline/module.json';
        }
        const manifest: ExternalModuleManifest = externalLoader.validateManifest(parsed);

        const steps: InstallStep[] = [
          {
            id: 'verify',
            label: 'Verifying offline manifest',
            status: 'running',
            detail: file.name,
          },
        ];

        setInstallProgress({
          visible: true,
          title: `Installing ${manifest.name}`,
          subtitle: `Offline — ${file.name}`,
          steps,
          type: 'install',
        });

        const bundleFile = Array.from(files).find((f) => {
          const expected = manifest.entry.replace('./', '');
          return f.name === expected || f.name.endsWith(expected);
        });

        if (!bundleFile) {
          throw new Error(`Bundle file not found: ${manifest.entry}`);
        }

        const bundleCode = await bundleFile.text();

        steps[0]!.status = 'done';
        steps.push(
          { id: 'checksum', label: 'Verifying checksum', status: 'running' },
          { id: 'register', label: 'Registering module', status: 'pending' },
          { id: 'finalize', label: 'Finalizing', status: 'pending' },
        );
        setInstallProgress((p) => (p ? { ...p, steps: [...steps] } : p));
        await sleep(300);

        const actualHash = await sha256(bundleCode);
        if (actualHash !== manifest.checksum) {
          throw new Error(`Checksum mismatch: expected ${manifest.checksum}, got ${actualHash}`);
        }

        steps[1]!.status = 'done';
        steps[2]!.status = 'running';
        steps[2]!.detail = manifest.id;
        setInstallProgress((p) => (p ? { ...p, steps: [...steps] } : p));
        await sleep(300);

        if (externalLoader.getInstalledModule(manifest.id)) {
          await externalLoader.uninstall(manifest.id);
        }

        await externalLoader.installFromCode(manifest, bundleCode, { source: 'url' });
        steps[2]!.status = 'done';
        steps[3]!.status = 'running';
        setInstallProgress((p) => (p ? { ...p, steps: [...steps] } : p));
        await sleep(300);

        steps[3]!.status = 'done';
        setInstallProgress((p) => (p ? { ...p, steps: [...steps] } : p));
        refreshInstalled();
        setOfflineResetKey((k) => k + 1);
        setHighlightedId(manifest.id);
        setActiveTab('installed');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const current = [...(installProgress?.steps ?? [])];
        const runningIdx = current.findIndex((s) => s.status === 'running');
        if (runningIdx >= 0) {
          current[runningIdx] = { ...current[runningIdx]!, status: 'error', detail: errorMsg };
        }
        if (installProgress) {
          setInstallProgress((p) => (p ? { ...p, steps: current } : p));
        } else {
          setInstallProgress({
            visible: true,
            title: 'Installation Failed',
            subtitle: errorMsg,
            steps: [{ id: 'error', label: errorMsg, status: 'error', detail: '' }],
            type: 'install',
          });
        }
      }
    }
  };

  return (
    <div className="bg-background text-foreground flex h-full flex-col">
      <div className="border-border/30 flex items-center justify-between border-b px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
            <Grid3X3 size={16} />
          </span>
          <div>
            <h2 className="text-foreground text-base font-semibold">AppStore</h2>
            <p className="text-foreground/40 text-[11px]">Discover, install, and manage modules</p>
          </div>
        </div>
        <button
          onClick={refreshInstalled}
          className="border-border/30 bg-foreground/5 text-foreground/60 hover:bg-foreground/10 hover:text-foreground/80 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] transition-colors"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      <div className="border-border/30 bg-foreground/[0.02] flex gap-0.5 border-b px-4 pt-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-t-lg px-3.5 py-2 text-[11px] font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-foreground/40 hover:bg-foreground/[0.03] hover:text-foreground/60',
              )}
            >
              <Icon size={14} />
              {tab.label}
              {tab.id === 'installed' && installed.length > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500/15 px-1 text-[9px] text-blue-400">
                  {installed.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'browse' && <BrowseTab onInstall={(url) => installModule(url)} />}

        {activeTab === 'install-url' && <UrlInstallTab onInstall={(url) => installModule(url)} />}

        {activeTab === 'installed' && (
          <InstalledTab
            entries={installed}
            builtinEntries={builtinEntries}
            loading={loadingInstalled}
            onUninstall={uninstallModule}
            highlightId={highlightedId}
          />
        )}

        {activeTab === 'offline' && <OfflineTab key={offlineResetKey} onInstall={offlineInstall} />}
      </div>

      {installProgress?.visible && (
        <InstallProgress
          title={installProgress.title}
          subtitle={installProgress.subtitle}
          steps={installProgress.steps}
          type={installProgress.type}
          onClose={() => setInstallProgress(null)}
        />
      )}
    </div>
  );
}

const ICON_MAP: Record<string, string> = {
  folder: '📁',
  settings: '⚙️',
  activity: '📊',
  camera: '📷',
  sparkles: '✨',
  grid: '🔲',
  code: '💻',
  monitor: '🖥️',
  package: '📦',
};

function getIcon(icon: string): string {
  return (ICON_MAP[icon] ?? icon.length <= 2) ? icon : '🧩';
}

function InstalledTab({
  entries,
  builtinEntries,
  loading,
  onUninstall,
  highlightId,
}: {
  entries: ExternalModuleEntry[];
  builtinEntries: ModuleEntry[];
  loading: boolean;
  onUninstall: (entry: ExternalModuleEntry) => void;
  highlightId: string | null;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightId && listRef.current) {
      const el = listRef.current.querySelector(`[data-module-id="${highlightId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={18} className="text-foreground/30 animate-spin" />
      </div>
    );
  }

  const allModules: { type: 'builtin' | 'external'; data: ModuleEntry | ExternalModuleEntry }[] = [
    ...builtinEntries.map((e) => ({ type: 'builtin' as const, data: e })),
    ...entries.map((e) => ({ type: 'external' as const, data: e })),
  ].filter((m) => {
    const manifest = m.data.manifest;
    return (
      !filter ||
      manifest.name.toLowerCase().includes(filter.toLowerCase()) ||
      manifest.id.toLowerCase().includes(filter.toLowerCase())
    );
  });

  if (allModules.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Package size={36} className="text-foreground/20" />
        <p className="text-foreground/40 text-sm">
          {filter ? 'Tidak ditemukan' : 'Belum ada modul'}
        </p>
        <p className="text-foreground/30 text-xs">Browse the AppStore to find modules</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Cari modul..."
          className="bg-foreground/5 text-foreground placeholder:text-foreground/20 border-border/20 focus:border-border/40 min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-xs outline-none"
        />
      </div>
      <div className="mb-3">
        <p className="text-foreground/40 text-xs">
          {allModules.length} modul diinstal
          <span className="text-foreground/20 ml-2 text-[10px]">
            ({builtinEntries.length} bawaan, {entries.length} eksternal)
          </span>
        </p>
      </div>
      <div ref={listRef} className="grid grid-cols-2 gap-3">
        {allModules.map((m) => {
          const isBuiltin = m.type === 'builtin';
          const moduleEntry = m.data as ModuleEntry;
          const extEntry = m.data as ExternalModuleEntry;
          const manifest = m.data.manifest;

          return (
            <div
              key={`${m.type}-${manifest.id}`}
              data-module-id={manifest.id}
              className={cn(
                'flex flex-col gap-3 rounded-xl border p-4 transition-all duration-700',
                highlightId === manifest.id
                  ? 'border-blue-400/60 bg-blue-500/5 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                  : 'border-border/20 bg-foreground/[0.02] hover:border-border/40 hover:bg-foreground/[0.04]',
              )}
            >
              <div className="flex items-start gap-3">
                <span className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base">
                  {getIcon(manifest.icon)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground truncate text-sm font-medium">
                      {manifest.name}
                    </span>
                    <span className="text-foreground/40 shrink-0 text-[10px]">
                      v{manifest.version}
                    </span>
                  </div>
                  <p className="text-foreground/40 mt-0.5 line-clamp-2 text-xs leading-relaxed">
                    {manifest.description}
                  </p>
                </div>
              </div>

              <div className="border-border/10 flex items-center justify-between border-t pt-3">
                <div className="flex items-center gap-2">
                  <span className="bg-foreground/5 text-foreground/40 rounded px-1.5 py-0.5 text-[9px] capitalize">
                    {isBuiltin ? 'bawaan' : 'eksternal'}
                  </span>
                  {isBuiltin && moduleEntry.status && (
                    <span
                      className={cn(
                        'text-[10px]',
                        moduleEntry.status === 'active' ? 'text-green-400' : 'text-foreground/30',
                      )}
                    >
                      {moduleEntry.status === 'active' ? 'Berjalan' : moduleEntry.status}
                    </span>
                  )}
                  {!isBuiltin && (
                    <span className="text-foreground/30 text-[10px]">
                      {(extEntry.bundleSize / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {isBuiltin ? (
                    <span className="text-foreground/20 px-2 text-[10px]">Bawaan</span>
                  ) : confirmId === extEntry.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onUninstall(extEntry);
                          setConfirmId(null);
                        }}
                        className="flex items-center gap-1 rounded-lg bg-red-500/15 px-2 py-1 text-[10px] font-medium text-red-400 transition-colors hover:bg-red-500/25"
                      >
                        <Trash2 size={10} /> Confirm
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="text-foreground/40 hover:bg-foreground/5 rounded-lg px-2 py-1 text-[10px] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(extEntry.id)}
                      className="text-foreground/40 flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 size={10} /> Uninstall
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ALLOWED_MANIFEST_NAMES = ['module.json'];
const ALLOWED_BUNDLE_EXTS = ['.js', '.mjs'];

interface FileValidation {
  valid: boolean;
  error?: string;
  manifestFile?: File;
  bundleFile?: File;
}

function validateModuleFiles(files: File[]): FileValidation {
  if (files.length === 0) return { valid: false, error: 'No files selected' };
  if (files.length > 5) return { valid: false, error: 'Too many files (max 5)' };

  const manifestFiles = files.filter((f) => ALLOWED_MANIFEST_NAMES.includes(f.name));
  if (manifestFiles.length === 0) {
    return { valid: false, error: 'Missing module.json — pilih file manifest modul' };
  }
  if (manifestFiles.length > 1) {
    return { valid: false, error: 'Hanya satu module.json yang diizinkan' };
  }

  const invalidFiles = files.filter((f) => {
    if (ALLOWED_MANIFEST_NAMES.includes(f.name)) return false;
    return !ALLOWED_BUNDLE_EXTS.some((e) => f.name.endsWith(e));
  });

  if (invalidFiles.length > 0) {
    return {
      valid: false,
      error: `File tidak valid: ${invalidFiles.map((f) => f.name).join(', ')}. Hanya file module.json dan bundle (.js/.mjs) yang diizinkan`,
    };
  }

  const manifestFile = manifestFiles[0]!;
  const bundleFile = files.find((f) => f.name.endsWith('.js') || f.name.endsWith('.mjs'));

  return { valid: true, manifestFile, bundleFile };
}

function OfflineTab({ onInstall }: { onInstall: (files: FileList) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [validation, setValidation] = useState<FileValidation | null>(null);
  const installing = useRef(false);

  useEffect(() => {
    if (files.length > 0 && validation?.valid && !installing.current) {
      installing.current = true;
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      onInstall(dt.files);
    }
  }, [files, validation, onInstall]);

  const processFiles = (raw: File[]) => {
    setFiles(raw);
    setValidation(validateModuleFiles(raw));
    installing.current = false;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 transition-colors',
          dragOver && !validation?.valid
            ? 'border-blue-400 bg-blue-500/5'
            : validation?.valid
              ? 'border-green-400 bg-green-500/5'
              : validation && !validation.valid
                ? 'border-red-400 bg-red-500/5'
                : 'border-border/30 hover:border-border/50',
        )}
      >
        <Upload
          size={32}
          className={cn(
            'transition-colors',
            dragOver && !validation?.valid
              ? 'text-blue-400'
              : validation?.valid
                ? 'text-green-400'
                : validation && !validation.valid
                  ? 'text-red-400'
                  : 'text-foreground/20',
          )}
        />
        <div className="text-center">
          <p className="text-foreground/60 text-sm font-medium">
            {validation?.error
              ? validation.error
              : validation?.valid
                ? 'Module files valid — menginstal...'
                : dragOver
                  ? 'Drop files here'
                  : 'Drag & drop module files'}
          </p>
          <p className="text-foreground/40 mt-1 text-xs">
            Hanya file <strong>module.json</strong> dan bundle <strong>.js/.mjs</strong> yang
            diizinkan
          </p>
        </div>
        <label className="bg-foreground/10 text-foreground/60 hover:bg-foreground/15 cursor-pointer rounded-lg px-4 py-2 text-xs font-medium transition-colors">
          <input
            type="file"
            multiple
            accept=".json,.js,.mjs"
            className="hidden"
            onChange={handleFilePick}
          />
          Select Files
        </label>
      </div>

      {files.length > 0 && (
        <div className="border-border/20 bg-foreground/[0.02] rounded-xl border p-4">
          <p className="text-foreground/60 mb-2 text-xs font-medium">Selected Files</p>
          <div className="space-y-1.5">
            {files.map((f, i) => {
              const isValid =
                ALLOWED_MANIFEST_NAMES.includes(f.name) ||
                ALLOWED_BUNDLE_EXTS.some((e) => f.name.endsWith(e));
              return (
                <div
                  key={i}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2',
                    isValid ? 'bg-foreground/[0.02]' : 'bg-red-500/10',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <FileCode
                      size={14}
                      className={cn(isValid ? 'text-foreground/30' : 'text-red-400')}
                    />
                    <span
                      className={cn('text-xs', isValid ? 'text-foreground/60' : 'text-red-400')}
                    >
                      {f.name}
                    </span>
                  </div>
                  <span className="text-foreground/30 text-[10px]">
                    {(f.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-border/20 rounded-xl border bg-amber-500/5 px-4 py-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />
          <p className="text-foreground/50 text-xs leading-relaxed">
            Offline installation bypasses registry security checks. Only install modules from
            trusted sources. Verify the module's integrity before installing.
          </p>
        </div>
      </div>
    </div>
  );
}

function UrlInstallTab({ onInstall }: { onInstall: (url: string) => void }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleInstall = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Masukkan URL module.json');
      return;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setError('URL harus dimulai dengan http:// atau https://');
      return;
    }
    setError(null);
    onInstall(trimmed);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="border-border/20 bg-foreground/[0.02] rounded-xl border p-5">
        <p className="text-foreground/60 mb-3 text-xs font-medium">Module URL</p>
        <input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleInstall()}
          placeholder="http://localhost:4321"
          className="border-border/20 bg-background text-foreground placeholder:text-foreground/20 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20"
        />
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <button
          onClick={handleInstall}
          disabled={!url.trim()}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-40"
        >
          <Download size={14} />
          Install from URL
        </button>
      </div>

      <div className="border-border/20 rounded-xl border bg-blue-500/5 px-4 py-3">
        <div className="flex items-start gap-2">
          <Globe size={14} className="mt-0.5 shrink-0 text-blue-400" />
          <p className="text-foreground/50 text-xs leading-relaxed">
            Masukkan URL ke folder <strong>dist/</strong> module yang sudah di-build. Server harus
            menyajikan <strong>module.json</strong> di root URL dan
            <strong> bundle.js</strong> sesuai entry di manifest. Cocok untuk menguji module dari{' '}
            <strong>dev server</strong> (<code>arunaos dev</code>) atau hosting sementara.
          </p>
        </div>
      </div>
    </div>
  );
}

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
