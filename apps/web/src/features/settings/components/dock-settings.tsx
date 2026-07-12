'use client';

import { useDockStore, ICON_MAP } from '@/features/dock/stores/dock.store';
import type { DockPosition, DockItem } from '@/features/dock/stores/dock.store';
import { cn } from '@/lib/utils';
import {
  PanelBottom,
  PanelLeft,
  PanelRight,
  RotateCcw,
  Eye,
  EyeOff,
  GripVertical,
} from 'lucide-react';

const POSITIONS: { id: DockPosition; label: string; icon: React.ElementType }[] = [
  { id: 'bottom', label: 'Bawah', icon: PanelBottom },
  { id: 'left', label: 'Kiri', icon: PanelLeft },
  { id: 'right', label: 'Kanan', icon: PanelRight },
];

export function DockPanel() {
  const items = useDockStore((s) => s.items);
  const settings = useDockStore((s) => s.settings);
  const setIconSize = useDockStore((s) => s.setIconSize);
  const setPosition = useDockStore((s) => s.setPosition);
  const setAutoHide = useDockStore((s) => s.setAutoHide);
  const setMagnification = useDockStore((s) => s.setMagnification);
  const setMagnificationSize = useDockStore((s) => s.setMagnificationSize);
  const toggleItemVisibility = useDockStore((s) => s.toggleItemVisibility);
  const removeFromDock = useDockStore((s) => s.removeFromDock);
  const resetItems = useDockStore((s) => s.resetItems);

  return (
    <div className="space-y-6">
      {/* Position */}
      <div>
        <h3 className="text-foreground mb-3 text-sm font-semibold">Posisi Dock</h3>
        <div className="flex gap-2">
          {POSITIONS.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                onClick={() => setPosition(p.id)}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1.5 rounded-xl border p-3 transition-colors',
                  settings.position === p.id
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border/20 text-foreground/50 hover:border-border/40 hover:bg-muted/30',
                )}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Icon Size */}
      <div>
        <h3 className="text-foreground mb-3 text-sm font-semibold">Ukuran Icon</h3>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={16}
            max={40}
            value={settings.iconSize}
            onChange={(e) => setIconSize(Number(e.target.value))}
            className="accent-primary flex-1"
          />
          <span className="text-foreground/60 min-w-8 text-right text-xs tabular-nums">
            {settings.iconSize}px
          </span>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <h3 className="text-foreground text-sm font-semibold">Perilaku</h3>

        <ToggleRow
          label="Sembunyikan otomatis"
          desc="Dock akan tersembunyi saat tidak digunakan"
          checked={settings.autoHide}
          onChange={setAutoHide}
        />
        <ToggleRow
          label="Magnification"
          desc="Icon akan membesar saat hover"
          checked={settings.magnification}
          onChange={setMagnification}
        />

        {settings.magnification && (
          <div className="ml-5 flex items-center gap-3">
            <span className="text-foreground/50 text-[11px]">Besar hover:</span>
            <input
              type="range"
              min={24}
              max={56}
              value={settings.magnificationSize}
              onChange={(e) => setMagnificationSize(Number(e.target.value))}
              className="accent-primary flex-1"
            />
            <span className="text-foreground/60 min-w-8 text-right text-xs tabular-nums">
              {settings.magnificationSize}px
            </span>
          </div>
        )}
      </div>

      {/* Items */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-foreground text-sm font-semibold">Item Dock</h3>
          <button
            onClick={resetItems}
            className="text-foreground/40 hover:text-foreground/70 flex items-center gap-1 text-[10px] transition-colors"
          >
            <RotateCcw size={10} />
            Reset
          </button>
        </div>
        <div className="border-border/20 space-y-1 rounded-xl border p-2">
          {items.map((item) => (
            <DockItemRow
              key={item.id}
              item={item}
              onToggleVisibility={() => toggleItemVisibility(item.id)}
              onRemove={() => removeFromDock(item.id)}
            />
          ))}
          {items.length === 0 && (
            <p className="text-foreground/30 py-4 text-center text-xs">Tidak ada item di dock</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DockItemRow({
  item,
  onToggleVisibility,
  onRemove,
}: {
  item: DockItem;
  onToggleVisibility: () => void;
  onRemove: () => void;
}) {
  const Icon = ICON_MAP[item.iconName];

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors',
        item.hidden ? 'opacity-40' : 'hover:bg-muted/30',
      )}
    >
      <GripVertical size={12} className="text-foreground/20 shrink-0" />
      <div className="bg-muted/50 flex h-7 w-7 items-center justify-center rounded-lg">
        {Icon && <Icon size={14} className="text-foreground/60" />}
      </div>
      <span
        className={cn(
          'flex-1 text-xs',
          item.hidden ? 'text-foreground/30 line-through' : 'text-foreground/70',
        )}
      >
        {item.label}
      </span>
      <button
        onClick={onToggleVisibility}
        className="text-foreground/30 hover:text-foreground/70 rounded p-1 transition-colors"
        title={item.hidden ? 'Tampilkan' : 'Sembunyikan'}
      >
        {item.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
      {!item.hidden && (
        <button
          onClick={onRemove}
          className="text-foreground/20 rounded p-1 text-[10px] transition-colors hover:text-red-400"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="border-border/20 flex items-center gap-3 rounded-xl border p-3">
      <div className="flex-1">
        <p className="text-foreground/80 text-xs font-medium">{label}</p>
        <p className="text-foreground/40 text-[10px]">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-foreground/20',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  );
}
