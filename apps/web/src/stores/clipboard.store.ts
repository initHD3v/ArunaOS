import { create } from 'zustand';

export interface ClipboardItemEntry {
  id: string;
  name: string;
  isDir: boolean;
  sourceType: 'native' | 'virtual';
  nativeSourceHandleId?: string;
  virtualItemId?: string;
}

interface ClipboardState {
  items: ClipboardItemEntry[];
  mode: 'copy' | 'cut' | null;
  count: number;

  copy: (items: ClipboardItemEntry[]) => void;
  cut: (items: ClipboardItemEntry[]) => void;
  clear: () => void;
}

let nextHandleId = 0;

export const clipboardHandleMap = new Map<string, FileSystemDirectoryHandle>();

export const useClipboardStore = create<ClipboardState>((set) => ({
  items: [],
  mode: null,
  count: 0,

  copy: (items) => set({ items, mode: 'copy', count: items.length }),

  cut: (items) => set({ items, mode: 'cut', count: items.length }),

  clear: () => {
    clipboardHandleMap.clear();
    set({ items: [], mode: null, count: 0 });
  },
}));

export function storeNativeHandle(handle: FileSystemDirectoryHandle): string {
  const id = `clip-handle-${++nextHandleId}`;
  clipboardHandleMap.set(id, handle);
  return id;
}
