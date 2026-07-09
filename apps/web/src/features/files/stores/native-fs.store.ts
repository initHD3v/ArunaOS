import { create } from 'zustand';

export interface NativeEntry {
  name: string;
  type: 'file' | 'directory';
}

export interface MountedDrive {
  id: string;
  name: string;
}

interface NativeFSState {
  isSupported: boolean;
  drives: MountedDrive[];
  activeDriveId: string | null;
  currentPath: string[];
  entries: NativeEntry[];
  loading: boolean;
  error: string | null;

  mountDrive: () => Promise<void>;
  unmountDrive: (id: string) => void;
  switchDrive: (id: string) => Promise<void>;
  readDirectory: () => Promise<void>;
  navigateTo: (name: string) => Promise<void>;
  goBack: () => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  createFile: (name: string) => Promise<void>;
  deleteEntry: (name: string) => Promise<void>;
  renameEntry: (oldName: string, newName: string) => Promise<void>;
  readFileAsFile: (name: string) => Promise<File | null>;
  writeFileBuffer: (name: string, data: ArrayBuffer) => Promise<boolean>;
  getCurrentHandle: () => FileSystemDirectoryHandle | null;
  reset: () => void;
}

const driveHandles = new Map<string, FileSystemDirectoryHandle>();
let activeDriveId: string | null = null;
let currentHandle: FileSystemDirectoryHandle | null = null;
const handleStack: FileSystemDirectoryHandle[] = [];

async function readEntries(dir: FileSystemDirectoryHandle): Promise<NativeEntry[]> {
  const items: NativeEntry[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iter = (dir as any).entries() as AsyncIterableIterator<[string, FileSystemHandle]>;
  for await (const [name, handle] of iter) {
    items.push({ name, type: handle.kind as 'file' | 'directory' });
  }
  return items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

let nextDriveId = 0;

export const useNativeFSStore = create<NativeFSState>((set, get) => ({
  isSupported:
    typeof window !== 'undefined' &&
    typeof (
      window as Window &
        typeof globalThis & { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }
    ).showDirectoryPicker === 'function',
  drives: [],
  activeDriveId: null,
  currentPath: [],
  entries: [],
  loading: false,
  error: null,

  mountDrive: async () => {
    try {
      set({ loading: true, error: null });
      const w = window as Window &
        typeof globalThis & { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> };
      const handle = await w.showDirectoryPicker();
      const id = `drive-${++nextDriveId}`;
      driveHandles.set(id, handle);

      activeDriveId = id;
      currentHandle = handle;
      handleStack.length = 0;
      const entries = await readEntries(handle);

      set((s) => ({
        drives: [...s.drives, { id, name: handle.name }],
        activeDriveId: id,
        currentPath: [handle.name],
        entries,
        loading: false,
      }));
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      if (error.name !== 'AbortError' && error.name !== 'SecurityError') {
        set({ error: error.message ?? 'Failed to access directory', loading: false });
      } else {
        set({ loading: false });
      }
    }
  },

  unmountDrive: (id: string) => {
    driveHandles.delete(id);
    if (activeDriveId === id) {
      activeDriveId = null;
      currentHandle = null;
      handleStack.length = 0;
    }
    set((s) => ({
      drives: s.drives.filter((d) => d.id !== id),
      activeDriveId: activeDriveId === id ? null : s.activeDriveId,
      currentPath: activeDriveId === id ? [] : s.currentPath,
      entries: activeDriveId === id ? [] : s.entries,
    }));
  },

  switchDrive: async (id: string) => {
    const handle = driveHandles.get(id);
    if (!handle) return;
    activeDriveId = id;
    currentHandle = handle;
    handleStack.length = 0;
    try {
      set({ loading: true });
      const entries = await readEntries(handle);
      set({
        activeDriveId: id,
        currentPath: [handle.name],
        entries,
        loading: false,
      });
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message ?? 'Failed to read drive',
        loading: false,
      });
    }
  },

  readDirectory: async () => {
    const h = currentHandle;
    if (!h) return;
    try {
      set({ loading: true });
      const entries = await readEntries(h);
      set({ entries, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message ?? 'Failed to read directory',
        loading: false,
      });
    }
  },

  navigateTo: async (name: string) => {
    const h = currentHandle;
    if (!h) return;
    try {
      const child = await h.getDirectoryHandle(name);
      handleStack.push(h);
      currentHandle = child;
      const path = [...get().currentPath, name];
      const entries = await readEntries(child);
      set({ currentPath: path, entries, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message ?? 'Failed to open folder',
        loading: false,
      });
    }
  },

  goBack: async () => {
    if (handleStack.length === 0) return;
    const parent = handleStack.pop()!;
    currentHandle = parent;
    const path = get().currentPath.slice(0, -1);
    const entries = await readEntries(parent);
    set({ currentPath: path.length > 0 ? path : [parent.name], entries });
  },

  createFolder: async (name: string) => {
    const h = currentHandle;
    if (!h) return;
    try {
      await h.getDirectoryHandle(name, { create: true });
      await get().readDirectory();
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message ?? 'Failed to create folder' });
    }
  },

  createFile: async (name: string) => {
    const h = currentHandle;
    if (!h) return;
    try {
      const fileHandle = await h.getFileHandle(name, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.close();
      await get().readDirectory();
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message ?? 'Failed to create file' });
    }
  },

  deleteEntry: async (name: string) => {
    const h = currentHandle;
    if (!h) return;
    try {
      await h.removeEntry(name, { recursive: true });
      await get().readDirectory();
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message ?? 'Failed to delete' });
    }
  },

  renameEntry: async (oldName: string, newName: string) => {
    const h = currentHandle;
    if (!h) return;
    try {
      let isDir = false;
      let fileHandle: FileSystemFileHandle | null = null;
      try {
        fileHandle = await h.getFileHandle(oldName);
      } catch {
        try {
          await h.getDirectoryHandle(oldName);
          isDir = true;
        } catch {
          set({ error: 'Entry not found' });
          return;
        }
      }

      if (isDir) {
        const oldDir = await h.getDirectoryHandle(oldName);
        const newDir = await h.getDirectoryHandle(newName, { create: true });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const iter = (oldDir as any).entries() as AsyncIterableIterator<[string, FileSystemHandle]>;
        for await (const [childName, childHandle] of iter) {
          if (childHandle.kind === 'file') {
            const srcFile = await oldDir.getFileHandle(childName);
            const dstFile = await newDir.getFileHandle(childName, { create: true });
            const buf = await (await srcFile.getFile()).arrayBuffer();
            const w = await dstFile.createWritable();
            await w.write(buf);
            await w.close();
          } else {
            const subSrc = await oldDir.getDirectoryHandle(childName);
            const subDst = await newDir.getDirectoryHandle(childName, { create: true });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const si = (subSrc as any).entries() as AsyncIterableIterator<
              [string, FileSystemHandle]
            >;
            for await (const [n, hh] of si) {
              if (hh.kind === 'file') {
                const f = await subSrc.getFileHandle(n);
                const d = await subDst.getFileHandle(n, { create: true });
                const buf = await (await f.getFile()).arrayBuffer();
                const w = await d.createWritable();
                await w.write(buf);
                await w.close();
              }
            }
          }
        }
        await h.removeEntry(oldName, { recursive: true });
      } else if (fileHandle) {
        const fileData = await (await fileHandle.getFile()).arrayBuffer();
        const newFile = await h.getFileHandle(newName, { create: true });
        const writable = await newFile.createWritable();
        await writable.write(fileData);
        await writable.close();
        await h.removeEntry(oldName);
      }

      await get().readDirectory();
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message ?? 'Failed to rename' });
    }
  },

  readFileAsFile: async (name: string) => {
    const h = currentHandle;
    if (!h) return null;
    try {
      const fileHandle = await h.getFileHandle(name);
      return await fileHandle.getFile();
    } catch {
      return null;
    }
  },

  writeFileBuffer: async (name: string, data: ArrayBuffer) => {
    const h = currentHandle;
    if (!h) return false;
    try {
      const fileHandle = await h.getFileHandle(name, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(data);
      await writable.close();
      await get().readDirectory();
      return true;
    } catch {
      return false;
    }
  },

  getCurrentHandle: () => currentHandle,

  reset: () => {
    driveHandles.clear();
    activeDriveId = null;
    currentHandle = null;
    handleStack.length = 0;
    set({
      drives: [],
      activeDriveId: null,
      currentPath: [],
      entries: [],
      loading: false,
      error: null,
    });
  },
}));
