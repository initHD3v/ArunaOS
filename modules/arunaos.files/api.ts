import { useFilesStore } from '@/features/files/stores/files.store';
import type { FileItem } from '@/features/files/stores/files.store';

export interface FilesAPI {
  listFiles(parentId?: string): FileItem[];
  createFile(name: string, parentId?: string): string | null;
  createFolder(name: string, parentId?: string): string | null;
  deleteItem(id: string): void;
  renameItem(id: string, name: string): void;
}

export function createFilesAPI(): FilesAPI {
  return {
    listFiles(parentId?: string): FileItem[] {
      const state = useFilesStore.getState();
      const items = Object.values(state.items);
      return parentId
        ? items.filter((item) => item.parentId === parentId)
        : items.filter((item) => item.parentId === null);
    },

    createFile(name: string, parentId?: string): string | null {
      const state = useFilesStore.getState();
      return state.createItem(name, 'file', parentId ?? null);
    },

    createFolder(name: string, parentId?: string): string | null {
      const state = useFilesStore.getState();
      return state.createItem(name, 'folder', parentId ?? null);
    },

    deleteItem(id: string): void {
      const state = useFilesStore.getState();
      state.deleteItem(id);
    },

    renameItem(id: string, name: string): void {
      const state = useFilesStore.getState();
      state.renameItem(id, name);
    },
  };
}
