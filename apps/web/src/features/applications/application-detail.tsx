'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { ModuleEntry, ModuleManifest } from '@arunaos/runtime';
import { ExternalLink, X, Loader, Globe, Shield } from 'lucide-react';

const ICON_MAP: Record<string, string> = {
  folder: '📁',
  settings: '⚙️',
  activity: '📊',
  camera: '📷',
  sparkles: '✨',
  grid: '🔲',
  code: '💻',
  monitor: '🖥️',
  file: '📄',
  appstore: '🏪',
};

function getIcon(icon: string): string {
  return (ICON_MAP[icon] ?? icon.length <= 2) ? icon : '🧩';
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-foreground/30 text-[9px] uppercase tracking-wider">{children}</span>;
}

function Value({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('text-foreground/70 text-[11px]', className)}>{children}</div>;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <Value>{children}</Value>
    </div>
  );
}

export function ApplicationDetail({
  entry,
  opening,
  onClose,
  onOpen,
}: {
  entry: ModuleEntry;
  opening: boolean;
  onClose: () => void;
  onOpen: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const m = entry.manifest;
  const ext = m as ModuleManifest & {
    author?: string;
    homepage?: string;
    updatedAt?: string;
    categories?: string[];
  };

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    >
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="border-border/30 bg-card w-full max-w-sm overflow-hidden rounded-2xl border shadow-xl"
      >
        {/* Header */}
        <div className="relative p-5 pb-0">
          <button
            onClick={onClose}
            className="text-foreground/20 hover:text-foreground/60 hover:bg-muted absolute right-3 top-3 rounded-lg p-1 transition-colors"
          >
            <X size={14} />
          </button>

          <div className="flex items-center gap-3">
            <span className="bg-muted flex h-12 w-12 items-center justify-center rounded-2xl text-2xl">
              {getIcon(m.icon)}
            </span>
            <div className="min-w-0">
              <h3 className="text-foreground text-sm font-semibold">{m.name}</h3>
              <p className="text-foreground/40 truncate text-[10px]">{m.id}</p>
            </div>
          </div>

          {/* Status badge */}
          <div className="mt-3 flex items-center gap-2">
            <span
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium',
                entry.status === 'active'
                  ? 'bg-success/10 text-success'
                  : entry.status === 'error'
                    ? 'bg-danger/10 text-danger'
                    : 'bg-muted text-foreground/40',
              )}
            >
              <span
                className={cn(
                  'h-1 w-1 rounded-full',
                  entry.status === 'active'
                    ? 'bg-success'
                    : entry.status === 'loading'
                      ? 'bg-warning'
                      : entry.status === 'error'
                        ? 'bg-danger'
                        : 'bg-foreground/30',
                )}
              />
              {entry.status === 'active'
                ? 'Berjalan'
                : entry.status === 'loading'
                  ? 'Memuat'
                  : entry.status === 'suspended'
                    ? 'Ditangguhkan'
                    : entry.status === 'error'
                      ? 'Error'
                      : 'Terdaftar'}
            </span>
            <span className="text-foreground/30 bg-muted rounded-full px-2 py-0.5 text-[9px]">
              v{m.version}
            </span>
            <span className="text-foreground/30 bg-muted rounded-full px-2 py-0.5 text-[9px] capitalize">
              {m.type}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-3 p-5">
          {/* Description */}
          {m.description && (
            <DetailRow label="Deskripsi">
              <span className="text-foreground/60 text-[11px] leading-relaxed">
                {m.description}
              </span>
            </DetailRow>
          )}

          {/* Author (external) */}
          {ext.author && (
            <DetailRow label="Pengembang">
              <div className="flex items-center gap-1.5">
                <span>{ext.author}</span>
                {ext.homepage && (
                  <a
                    href={ext.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary/60 hover:text-primary"
                  >
                    <Globe size={10} />
                  </a>
                )}
              </div>
            </DetailRow>
          )}

          {/* Two-column info */}
          <div className="grid grid-cols-2 gap-3">
            {m.type && m.type !== 'external' && <DetailRow label="Tipe">{m.type}</DetailRow>}
            {m.version && <DetailRow label="Versi">{m.version}</DetailRow>}
            {ext.updatedAt && (
              <DetailRow label="Diperbarui">
                {new Date(ext.updatedAt).toLocaleDateString('id-ID')}
              </DetailRow>
            )}
            {ext.categories && ext.categories.length > 0 && (
              <DetailRow label="Kategori">
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {ext.categories.map((c: string) => (
                    <span
                      key={c}
                      className="bg-muted text-foreground/40 rounded px-1.5 py-0.5 text-[8px]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </DetailRow>
            )}
          </div>

          {/* Permissions */}
          {m.permissions && m.permissions.length > 0 && (
            <div>
              <Label>Izin</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {m.permissions.map((p) => (
                  <span
                    key={p}
                    className="bg-muted text-foreground/40 flex items-center gap-1 rounded px-1.5 py-0.5 text-[8px]"
                  >
                    <Shield size={8} />
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Window config */}
          {m.window && (
            <div className="grid grid-cols-2 gap-3">
              {m.window.defaultWidth && (
                <DetailRow label="Ukuran default">
                  {m.window.defaultWidth}×{m.window.defaultHeight}
                </DetailRow>
              )}
              {m.window.resizable !== undefined && (
                <DetailRow label="Resizable">{m.window.resizable ? 'Ya' : 'Tidak'}</DetailRow>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-border/20 flex items-center gap-2 border-t px-5 py-3">
          <button
            onClick={onOpen}
            disabled={opening}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-medium transition-all',
              'bg-primary hover:bg-primary/90 text-white',
              opening && 'opacity-60',
            )}
          >
            {opening ? <Loader size={12} className="animate-spin" /> : <ExternalLink size={12} />}
            {opening ? 'Membuka...' : 'Buka Aplikasi'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
