'use client';

interface ShortcutEntry {
  id: string;
  shortcut: string;
  handler: () => void;
  context: 'global' | 'window' | 'modal';
  description?: string;
  preventable: boolean;
}

type ModKey = 'meta' | 'ctrl' | 'alt' | 'shift';
type ParsedShortcut = { mods: ModKey[]; key: string };

function parseShortcut(s: string): ParsedShortcut {
  const parts = s.split('+').map((p) => p.trim().toLowerCase());
  const mods: ModKey[] = [];
  let key = '';
  for (const p of parts) {
    if (p === 'meta' || p === 'ctrl' || p === 'alt' || p === 'shift') {
      mods.push(p);
    } else {
      key = p;
    }
  }
  return { mods, key };
}

function matchEvent(e: KeyboardEvent, parsed: ParsedShortcut): boolean {
  if (!e.key) return false;
  const key = e.key.toLowerCase();
  if (key !== parsed.key && key !== parsed.key.toLowerCase()) return false;
  const hasMeta = e.metaKey || e.ctrlKey;
  const hasCtrl = e.ctrlKey;
  const hasAlt = e.altKey;
  const hasShift = e.shiftKey;

  for (const m of parsed.mods) {
    if (m === 'meta' && !hasMeta) return false;
    if (m === 'ctrl' && !hasCtrl) return false;
    if (m === 'alt' && !hasAlt) return false;
    if (m === 'shift' && !hasShift) return false;
  }

  if (!parsed.mods.includes('meta') && hasMeta) return false;
  if (!parsed.mods.includes('ctrl') && hasCtrl && !parsed.mods.includes('meta')) return false;
  if (!parsed.mods.includes('alt') && hasAlt) return false;
  if (!parsed.mods.includes('shift') && hasShift) return false;

  return true;
}

const LAYER_ORDER = { modal: 3, window: 2, global: 1 };

export class ShortcutService {
  private registry = new Map<string, ShortcutEntry>();
  private inputActive = false;

  register(
    id: string,
    shortcut: string,
    handler: () => void,
    options?: {
      context?: 'global' | 'window' | 'modal';
      description?: string;
      preventable?: boolean;
    },
  ): void {
    if (this.registry.has(id)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[ShortcutService] Overwriting shortcut "${id}"`);
      }
    }
    for (const [existingId, entry] of this.registry) {
      if (entry.shortcut === shortcut && existingId !== id) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `[ShortcutService] Keybinding collision: "${shortcut}" is used by both "${existingId}" and "${id}"`,
          );
        }
      }
    }
    this.registry.set(id, {
      id,
      shortcut,
      handler,
      context: options?.context ?? 'global',
      description: options?.description,
      preventable: options?.preventable ?? true,
    });
  }

  unregister(id: string): void {
    this.registry.delete(id);
  }

  getRegistry(): ShortcutEntry[] {
    return Array.from(this.registry.values());
  }

  setInputActive(active: boolean): void {
    this.inputActive = active;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (this.inputActive) return;

    const eligible = Array.from(this.registry.values())
      .filter((entry) => matchEvent(e, parseShortcut(entry.shortcut)))
      .sort((a, b) => LAYER_ORDER[b.context] - LAYER_ORDER[a.context]);

    if (eligible.length > 0) {
      const top = eligible[0]!;
      if (top.preventable) e.preventDefault();
      top.handler();
    }
  };

  mount(): () => void {
    document.addEventListener('keydown', this.handleKeyDown);
    return () => document.removeEventListener('keydown', this.handleKeyDown);
  }
}
