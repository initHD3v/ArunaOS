import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  icon: string;
  parentId: string | null;
  createdAt: number;
}

interface FilesState {
  items: Record<string, FileItem>;
  nextId: number;

  createItem: (name: string, type: 'file' | 'folder', parentId: string | null) => string;
  deleteItem: (id: string) => void;
  renameItem: (id: string, name: string) => void;
  getChildren: (parentId: string | null) => FileItem[];
}

export const useFilesStore = create<FilesState>()(
  persist(
    (set, get) => ({
      items: {
        root: {
          id: 'root',
          name: 'Desktop',
          type: 'folder',
          icon: 'folder',
          parentId: null,
          createdAt: 0,
        },
        documents: {
          id: 'documents',
          name: 'Documents',
          type: 'folder',
          icon: 'folder',
          parentId: null,
          createdAt: 0,
        },
        downloads: {
          id: 'downloads',
          name: 'Downloads',
          type: 'folder',
          icon: 'folder',
          parentId: null,
          createdAt: 0,
        },
      },
      nextId: 100,

      createItem: (name, type, parentId) => {
        const id = `file-${get().nextId}`;
        set((s) => ({
          items: {
            ...s.items,
            [id]: {
              id,
              name,
              type,
              icon: type === 'folder' ? 'folder' : 'file',
              parentId,
              createdAt: Date.now(),
            },
          },
          nextId: s.nextId + 1,
        }));
        return id;
      },

      deleteItem: (id) =>
        set((s) => {
          const items = { ...s.items };
          const toRemove = [id];
          const queue = [id];
          while (queue.length > 0) {
            const current = queue.pop()!;
            Object.values(items).forEach((item) => {
              if (item.parentId === current) {
                toRemove.push(item.id);
                queue.push(item.id);
              }
            });
          }
          toRemove.forEach((rid) => delete items[rid]);
          return { items };
        }),

      renameItem: (id, name) =>
        set((s) => ({
          items: s.items[id] ? { ...s.items, [id]: { ...s.items[id], name } } : s.items,
        })),

      getChildren: (parentId) =>
        Object.values(get().items).filter((item) => item.parentId === parentId),
    }),
    { name: 'arunaos-files' },
  ),
);
