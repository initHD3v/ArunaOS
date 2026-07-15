'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  FolderOpen,
  File,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Settings,
  HardDrive,
  X,
  Disc,
  ArrowUpDown,
  FileImage,
  FileAudio,
  FileVideo,
  FileText,
  FileCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDesktopStore } from '@/features/desktop/stores/desktop.store';
import { useWindowStore } from '@/features/window-manager/stores/window.store';
import { useUIStore } from '@/stores/ui-store';
import { useClipboardStore, storeNativeHandle, clipboardHandleMap } from '@/stores/clipboard.store';
import { useFilesStore, type FileItem } from '../stores/files.store';
import { putBlob, getBlob, deleteBlob } from '@/stores/file-blobs.db';
import { useNativeFSStore, type NativeEntry } from '../stores/native-fs.store';
import { getFileCategory, type FileCategory } from '@/features/viewer/utils/file-types';
import { useAIContextStore } from '@/stores/ai-context.store';
import { getAIContextActions } from '@/features/ai/ai-context-actions';
import type { DesktopIconData } from '@/types';

const iconMap: Record<string, React.ElementType> = {
  sparkles: Sparkles,
  folder: FolderOpen,
  settings: Settings,
  file: File,
};

const FOLDER_IDS = ['root', 'documents', 'downloads'];

function getIcon(item: { icon: string; type: string; name?: string }) {
  if (item.type === 'folder') return FolderOpen;
  if (item.name) {
    const cat = getFileCategory(item.name);
    return typeIconMap[cat] ?? File;
  }
  return iconMap[item.icon] ?? File;
}

function getItemLabel(item: DesktopIconData | FileItem) {
  return 'title' in item ? (item as DesktopIconData).title : (item as FileItem).name;
}

function isDesktopItem(item: DesktopIconData | FileItem): item is DesktopIconData {
  return 'appId' in item;
}

function getExtension(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

const typeIconMap: Record<FileCategory, React.ElementType> = {
  image: FileImage,
  audio: FileAudio,
  video: FileVideo,
  text: FileText,
  markdown: FileText,
  pdf: FileText,
  code: FileCode,
  unknown: File,
};

type SortBy = 'name' | 'type' | 'extension';

function isSortDir(item: { type?: string }): boolean {
  return item.type === 'folder' || item.type === 'directory';
}

function getSortName(item: { name?: string; title?: string }): string {
  return (item.name ?? item.title ?? '').toLowerCase();
}

function sortItems<T>(items: T[], sortBy: SortBy): T[] {
  return [...items].sort((a, b) => {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const aIsDir = isSortDir(ao as { type?: string });
    const bIsDir = isSortDir(bo as { type?: string });
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;

    const aName = getSortName(ao as { name?: string; title?: string });
    const bName = getSortName(bo as { name?: string; title?: string });

    switch (sortBy) {
      case 'name':
        return aName.localeCompare(bName);
      case 'type': {
        const aKind = ((ao.icon ?? ao.type) as string).toLowerCase();
        const bKind = ((bo.icon ?? bo.type) as string).toLowerCase();
        const kindCmp = aKind.localeCompare(bKind);
        return kindCmp !== 0 ? kindCmp : aName.localeCompare(bName);
      }
      case 'extension': {
        const aExt = getExtension(aName);
        const bExt = getExtension(bName);
        const extCmp = aExt.localeCompare(bExt);
        return extCmp !== 0 ? extCmp : aName.localeCompare(bName);
      }
    }
  });
}

const IMAGE_CATS = new Set<FileCategory>(['image']);

const FileThumbnail = memo(function FileThumbnail({
  name,
  blobId,
  icon,
}: {
  name: string;
  blobId?: string;
  icon: React.ElementType;
}) {
  const cat = getFileCategory(name);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const Icon = icon;

  useEffect(() => {
    if (!IMAGE_CATS.has(cat)) return;
    let cancelled = false;
    let url: string | null = null;
    (async () => {
      try {
        if (blobId) {
          const blob = await getBlob(blobId);
          if (!blob || cancelled) return;
          url = URL.createObjectURL(blob);
          if (!cancelled) setThumbnailUrl(url);
        }
      } catch {
        /* no blob */
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [blobId, cat]);

  if (thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
    );
  }

  return <Icon size={24} className="text-foreground/70" strokeWidth={1.5} />;
});

const sortLabels: Record<SortBy, string> = {
  name: 'Name',
  type: 'Kind',
  extension: 'Extension',
};

export const Finder = memo(function Finder() {
  const desktopIcons = useDesktopStore((s) => s.icons);
  const removeDesktopIcon = useDesktopStore((s) => s.removeIcon);
  const setRenamingIcon = useDesktopStore((s) => s.setRenamingIcon);
  const openWindow = useWindowStore((s) => s.openWindow);
  const showContextMenu = useUIStore((s) => s.showContextMenu);
  const { items: fileItems, createItem, deleteItem, renameItem } = useFilesStore();

  const nativeFS = useNativeFSStore();
  const isBrowsingNative = nativeFS.activeDriveId !== null;

  const [sortBy, setSortBy] = useState<SortBy>('name');

  const cycleSort = useCallback(() => {
    setSortBy((prev) => (prev === 'name' ? 'type' : prev === 'type' ? 'extension' : 'name'));
  }, []);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>('root');
  const [history, setHistory] = useState<string[]>(['root']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedRef = useRef<string | null>(null);

  const navigateTo = useCallback(
    (folderId: string | null) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(folderId ?? 'root');
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setCurrentFolderId(folderId);
      setSelectedIds(new Set());
      lastClickedRef.current = null;
    },
    [history, historyIndex],
  );

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      const folderId = history[newIdx];
      if (folderId !== undefined) {
        setHistoryIndex(newIdx);
        setCurrentFolderId(folderId);
      }
    }
  }, [history, historyIndex]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      const folderId = history[newIdx];
      if (folderId !== undefined) {
        setHistoryIndex(newIdx);
        setCurrentFolderId(folderId);
      }
    }
  }, [history, historyIndex]);

  const openItem = useCallback(
    async (item: DesktopIconData | FileItem) => {
      if (!isDesktopItem(item) && item.type === 'folder') {
        navigateTo(item.id);
      } else if (isDesktopItem(item)) {
        const id = `window-${item.id}-${Date.now()}`;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        openWindow({
          id,
          title: item.title,
          icon: item.icon,
          appId: item.appId,
          position: {
            x: Math.max(40, (vw - 960) / 2 + Math.random() * 80),
            y: Math.max(40, (vh - 640) / 2 + Math.random() * 40),
          },
          size: { width: 960, height: 640 },
          zIndex: 1,
          state: 'active',
        });
      } else if (!isDesktopItem(item) && item.type === 'file') {
        let blob: Blob | undefined;
        try {
          blob = await getBlob(item.id);
        } catch {
          /* skip */
        }
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        openWindow({
          id: `viewer-${item.id}-${Date.now()}`,
          title: item.name,
          icon: 'file',
          appId: 'viewer',
          appData: { url, filename: item.name },
          position: { x: Math.max(40, (vw - 800) / 2), y: Math.max(40, (vh - 600) / 2) },
          size: { width: 800, height: 600 },
          zIndex: 1,
          state: 'active',
        });
      }
    },
    [navigateTo, openWindow],
  );

  const handleDoubleClick = useCallback(
    (item: DesktopIconData | FileItem) => openItem(item),
    [openItem],
  );

  const handleNewFolder = useCallback(() => {
    const name = 'untitled folder';
    const existing = Object.values(fileItems).filter(
      (item) =>
        item.parentId === currentFolderId &&
        item.type === 'folder' &&
        item.name.startsWith('untitled folder'),
    );
    const finalName = existing.length > 0 ? `${name} ${existing.length + 1}` : name;
    createItem(finalName, 'folder', currentFolderId);
  }, [currentFolderId, createItem, fileItems]);

  const handleItemClick = useCallback((e: React.MouseEvent, id: string, allIds: string[]) => {
    if (e.shiftKey && lastClickedRef.current) {
      const lastIdx = allIds.indexOf(lastClickedRef.current);
      const currIdx = allIds.indexOf(id);
      if (lastIdx !== -1 && currIdx !== -1) {
        const start = Math.min(lastIdx, currIdx);
        const end = Math.max(lastIdx, currIdx);
        setSelectedIds(new Set(allIds.slice(start, end + 1)));
        lastClickedRef.current = id;
        return;
      }
    }
    if (e.metaKey || e.ctrlKey) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      lastClickedRef.current = id;
      return;
    }
    setSelectedIds(new Set([id]));
    lastClickedRef.current = id;
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastClickedRef.current = null;
  }, []);

  const clipboard = useClipboardStore();

  const handleNativeCopySelection = useCallback(
    (allEntries: NativeEntry[]) => {
      const h = nativeFS.getCurrentHandle();
      if (!h) return;
      const items = allEntries
        .filter((e) => selectedIds.has(e.name))
        .map((e) => ({
          id: e.name,
          name: e.name,
          isDir: e.type === 'directory',
          sourceType: 'native' as const,
          nativeSourceHandleId: storeNativeHandle(h),
        }));
      if (items.length === 0) return;
      clipboard.copy(items);
    },
    [nativeFS, clipboard, selectedIds],
  );

  const handleNativeCutSelection = useCallback(
    (allEntries: NativeEntry[]) => {
      const h = nativeFS.getCurrentHandle();
      if (!h) return;
      const items = allEntries
        .filter((e) => selectedIds.has(e.name))
        .map((e) => ({
          id: e.name,
          name: e.name,
          isDir: e.type === 'directory',
          sourceType: 'native' as const,
          nativeSourceHandleId: storeNativeHandle(h),
        }));
      if (items.length === 0) return;
      clipboard.cut(items);
    },
    [nativeFS, clipboard, selectedIds],
  );

  const handleVirtualCopySelection = useCallback(
    (allItems: FileItem[]) => {
      const items = allItems
        .filter((item) => selectedIds.has(item.id))
        .map((item) => ({
          id: item.id,
          name: item.name,
          isDir: item.type === 'folder',
          sourceType: 'virtual' as const,
          virtualItemId: item.id,
        }));
      if (items.length === 0) return;
      clipboard.copy(items);
    },
    [clipboard, selectedIds],
  );

  const handleVirtualCutSelection = useCallback(
    (allItems: FileItem[]) => {
      const items = allItems
        .filter((item) => selectedIds.has(item.id))
        .map((item) => ({
          id: item.id,
          name: item.name,
          isDir: item.type === 'folder',
          sourceType: 'virtual' as const,
          virtualItemId: item.id,
        }));
      if (items.length === 0) return;
      clipboard.cut(items);
    },
    [clipboard, selectedIds],
  );

  const handleNativePaste = useCallback(async () => {
    if (clipboard.items.length === 0) return;
    for (const item of clipboard.items) {
      if (item.sourceType === 'native' && item.nativeSourceHandleId) {
        const srcHandle = clipboardHandleMap.get(item.nativeSourceHandleId);
        if (!srcHandle) continue;
        try {
          if (item.isDir) {
            await nativeFS.createFolder(item.name);
          } else {
            const fileHandle = await srcHandle.getFileHandle(item.name);
            const file = await fileHandle.getFile();
            const buf = await file.arrayBuffer();
            await nativeFS.writeFileBuffer(item.name, buf);
          }
        } catch {
          /* skip */
        }
      } else if (item.sourceType === 'virtual') {
        await nativeFS.createFile(item.name);
      }
    }
    if (clipboard.mode === 'cut') clipboard.clear();
  }, [clipboard, nativeFS]);

  const handleVirtualPaste = useCallback(async () => {
    if (clipboard.items.length === 0) return;
    for (const item of clipboard.items) {
      if (item.sourceType === 'virtual' && item.virtualItemId) {
        const src = fileItems[item.virtualItemId];
        if (!src) continue;
        createItem(src.name, src.type as 'file' | 'folder', currentFolderId);
      } else if (item.sourceType === 'native' && item.nativeSourceHandleId) {
        const srcHandle = clipboardHandleMap.get(item.nativeSourceHandleId);
        if (!srcHandle) continue;
        try {
          if (item.isDir) {
            createItem(item.name, 'folder', currentFolderId);
          } else {
            const fileHandle = await srcHandle.getFileHandle(item.name);
            const file = await fileHandle.getFile();
            const id = createItem(item.name, 'file', currentFolderId);
            try {
              await putBlob(id, file);
            } catch {
              /* blob storage failed, metadata saved */
            }
          }
        } catch {
          /* skip */
        }
      }
    }
    if (clipboard.mode === 'cut') clipboard.clear();
  }, [clipboard, fileItems, createItem, currentFolderId]);

  const isRoot = currentFolderId === 'root';

  const rawSubItems: (DesktopIconData | FileItem)[] = isRoot
    ? desktopIcons
    : Object.values(fileItems).filter((item) => item.parentId === currentFolderId);

  const subItems = useMemo(() => sortItems(rawSubItems, sortBy), [rawSubItems, sortBy]);
  const sortedNativeEntries = useMemo(
    () => sortItems(nativeFS.entries, sortBy),
    [nativeFS.entries, sortBy],
  );

  const handleItemContextMenu = useCallback(
    (e: React.MouseEvent, item: DesktopIconData | FileItem) => {
      e.preventDefault();
      e.stopPropagation();

      const isMulti = selectedIds.size > 1;
      if (!selectedIds.has(item.id)) {
        setSelectedIds(new Set([item.id]));
        lastClickedRef.current = item.id;
      }

      const aiActions = !isMulti
        ? getAIContextActions({
            label: isDesktopItem(item) ? item.title : (item as FileItem).name,
            type: isDesktopItem(item)
              ? 'app'
              : (item as FileItem).type === 'folder'
                ? 'folder'
                : 'file',
          })
        : [];

      if (isDesktopItem(item)) {
        showContextMenu({ x: e.clientX, y: e.clientY }, [
          { id: 'open', label: 'Open', action: () => openItem(item) },
          { id: 'sep1', label: '', action: () => {}, separator: true },
          { id: 'rename', label: 'Rename', action: () => setRenamingIcon(item.id) },
          { id: 'delete', label: 'Delete', action: () => removeDesktopIcon(item.id) },
          ...(aiActions.length > 0
            ? [{ id: 'sep-ai', label: '', action: () => {}, separator: true }, ...aiActions]
            : []),
        ]);
      } else if (isMulti) {
        const count = selectedIds.size;
        showContextMenu({ x: e.clientX, y: e.clientY }, [
          {
            id: 'copy',
            label: `Copy ${count} Items`,
            action: () => handleVirtualCopySelection(rawSubItems as FileItem[]),
          },
          {
            id: 'cut',
            label: `Cut ${count} Items`,
            action: () => handleVirtualCutSelection(rawSubItems as FileItem[]),
          },
          { id: 'sep1', label: '', action: () => {}, separator: true },
          {
            id: 'delete',
            label: `Delete ${count} Items`,
            action: async () => {
              for (const id of selectedIds) {
                try {
                  await deleteBlob(id);
                } catch {
                  /* skip */
                }
                deleteItem(id);
              }
              setSelectedIds(new Set());
            },
          },
        ]);
      } else {
        const fi = item as FileItem;
        showContextMenu({ x: e.clientX, y: e.clientY }, [
          { id: 'open', label: 'Open', action: () => openItem(item) },
          { id: 'sep1', label: '', action: () => {}, separator: true },
          {
            id: 'copy',
            label: 'Copy',
            action: () => {
              handleVirtualCopySelection([fi]);
            },
          },
          {
            id: 'cut',
            label: 'Cut',
            action: () => {
              handleVirtualCutSelection([fi]);
            },
          },
          { id: 'sep2', label: '', action: () => {}, separator: true },
          {
            id: 'rename',
            label: 'Rename',
            action: () => {
              const result = prompt('Rename:', fi.name);
              if (result?.trim()) renameItem(fi.id, result.trim());
            },
          },
          {
            id: 'delete',
            label: 'Delete',
            action: async () => {
              try {
                await deleteBlob(fi.id);
              } catch {
                /* skip */
              }
              deleteItem(fi.id);
            },
          },
          ...(aiActions.length > 0
            ? [{ id: 'sep-ai', label: '', action: () => {}, separator: true }, ...aiActions]
            : []),
        ]);
      }
    },
    [
      showContextMenu,
      openItem,
      selectedIds,
      setRenamingIcon,
      removeDesktopIcon,
      renameItem,
      deleteItem,
      handleVirtualCopySelection,
      handleVirtualCutSelection,
      rawSubItems,
    ],
  );

  const handleEmptyContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      clearSelection();
      const items: { id: string; label: string; action: () => void; separator?: boolean }[] = [
        { id: 'new-folder', label: 'New Folder', action: handleNewFolder },
      ];
      if (clipboard.count > 0) {
        items.push(
          { id: 'sep-paste', label: '', action: () => {}, separator: true },
          {
            id: 'paste',
            label: `Paste ${clipboard.count} Item${clipboard.count > 1 ? 's' : ''}`,
            action: handleVirtualPaste,
          },
        );
      }
      items.push(
        { id: 'sep-ai', label: '', action: () => {}, separator: true },
        { id: 'ai-ask', label: 'Ask AI...', action: () => useAIContextStore.getState().askAI() },
        {
          id: 'ai-organize',
          label: 'Suggest Folder Structure',
          action: () =>
            useAIContextStore.getState().askAI('Suggest an organization structure for my files'),
        },
      );
      showContextMenu({ x: e.clientX, y: e.clientY }, items);
    },
    [showContextMenu, clearSelection, handleNewFolder, clipboard.count, handleVirtualPaste],
  );

  const handleSidebarNav = useCallback(
    (folderId: string) => {
      if (isBrowsingNative) nativeFS.reset();
      navigateTo(folderId);
    },
    [isBrowsingNative, nativeFS, navigateTo],
  );

  const handleDriveSwitch = useCallback(
    async (driveId: string) => {
      await nativeFS.switchDrive(driveId);
      clearSelection();
    },
    [nativeFS, clearSelection],
  );

  const handleNativeNavBack = useCallback(() => {
    nativeFS.goBack();
  }, [nativeFS]);

  const handleNativeOpenEntry = useCallback(
    async (entry: NativeEntry) => {
      if (entry.type === 'directory') {
        nativeFS.navigateTo(entry.name);
      } else {
        const file = await nativeFS.readFileAsFile(entry.name);
        if (!file) return;
        const url = URL.createObjectURL(file);
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        openWindow({
          id: `viewer-${Date.now()}`,
          title: entry.name,
          icon: 'file',
          appId: 'viewer',
          appData: { url, filename: entry.name },
          position: { x: Math.max(40, (vw - 800) / 2), y: Math.max(40, (vh - 600) / 2) },
          size: { width: 800, height: 600 },
          zIndex: 1,
          state: 'active',
        });
      }
    },
    [nativeFS, openWindow],
  );

  const handleNativeNewFolder = useCallback(() => {
    const name = prompt('New Folder Name:', 'untitled folder');
    if (name?.trim()) nativeFS.createFolder(name.trim());
  }, [nativeFS]);

  const handleNativeNewFile = useCallback(() => {
    const name = prompt('New File Name:', 'untitled.txt');
    if (name?.trim()) nativeFS.createFile(name.trim());
  }, [nativeFS]);

  const handleNativeItemContextMenu = useCallback(
    (e: React.MouseEvent, entry: NativeEntry) => {
      e.preventDefault();
      e.stopPropagation();

      const isMulti = selectedIds.size > 1;
      if (!selectedIds.has(entry.name)) {
        setSelectedIds(new Set([entry.name]));
        lastClickedRef.current = entry.name;
      }

      const aiActions = !isMulti
        ? getAIContextActions({
            label: entry.name,
            type: entry.type === 'directory' ? 'folder' : 'file',
          })
        : [];

      if (isMulti) {
        const count = selectedIds.size;
        showContextMenu({ x: e.clientX, y: e.clientY }, [
          {
            id: 'copy',
            label: `Copy ${count} Items`,
            action: () => handleNativeCopySelection(sortedNativeEntries as NativeEntry[]),
          },
          {
            id: 'cut',
            label: `Cut ${count} Items`,
            action: () => handleNativeCutSelection(sortedNativeEntries as NativeEntry[]),
          },
          { id: 'sep1', label: '', action: () => {}, separator: true },
          {
            id: 'delete',
            label: `Delete ${count} Items`,
            action: () => {
              for (const name of selectedIds) {
                nativeFS.deleteEntry(name);
              }
              setSelectedIds(new Set());
            },
          },
        ]);
      } else {
        showContextMenu({ x: e.clientX, y: e.clientY }, [
          { id: 'open', label: 'Open', action: () => handleNativeOpenEntry(entry) },
          { id: 'sep1', label: '', action: () => {}, separator: true },
          { id: 'copy', label: 'Copy', action: () => handleNativeCopySelection([entry]) },
          { id: 'cut', label: 'Cut', action: () => handleNativeCutSelection([entry]) },
          { id: 'sep2', label: '', action: () => {}, separator: true },
          {
            id: 'rename',
            label: 'Rename',
            action: () => {
              const result = prompt('Rename:', entry.name);
              if (result?.trim()) nativeFS.renameEntry(entry.name, result.trim());
            },
          },
          { id: 'delete', label: 'Delete', action: () => nativeFS.deleteEntry(entry.name) },
          ...(aiActions.length > 0
            ? [{ id: 'sep-ai', label: '', action: () => {}, separator: true }, ...aiActions]
            : []),
        ]);
      }
    },
    [
      showContextMenu,
      handleNativeOpenEntry,
      handleNativeCopySelection,
      handleNativeCutSelection,
      nativeFS,
      selectedIds,
      sortedNativeEntries,
    ],
  );

  const handleNativeEmptyContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      clearSelection();
      const items: { id: string; label: string; action: () => void; separator?: boolean }[] = [
        { id: 'new-folder', label: 'New Folder', action: handleNativeNewFolder },
        { id: 'new-file', label: 'New File', action: handleNativeNewFile },
      ];
      if (clipboard.count > 0) {
        items.push(
          { id: 'sep-paste', label: '', action: () => {}, separator: true },
          {
            id: 'paste',
            label: `Paste ${clipboard.count} Item${clipboard.count > 1 ? 's' : ''}`,
            action: handleNativePaste,
          },
        );
      }
      items.push(
        { id: 'sep-ai', label: '', action: () => {}, separator: true },
        { id: 'ai-ask', label: 'Ask AI...', action: () => useAIContextStore.getState().askAI() },
        {
          id: 'ai-organize',
          label: 'Suggest Folder Structure',
          action: () =>
            useAIContextStore.getState().askAI('Suggest an organization structure for my files'),
        },
      );
      showContextMenu({ x: e.clientX, y: e.clientY }, items);
    },
    [
      showContextMenu,
      clearSelection,
      handleNativeNewFolder,
      handleNativeNewFile,
      clipboard.count,
      handleNativePaste,
    ],
  );

  const currentFolder = currentFolderId ? fileItems[currentFolderId] : null;
  const sidebarLocations = FOLDER_IDS.map((id) => fileItems[id]).filter(
    (x): x is FileItem => x !== undefined,
  );

  return (
    <div className="bg-background/40 flex h-full flex-col">
      <div className="border-border/20 flex h-9 shrink-0 items-center gap-1 border-b px-3">
        <button
          onClick={isBrowsingNative ? handleNativeNavBack : goBack}
          disabled={isBrowsingNative ? nativeFS.currentPath.length <= 1 : historyIndex <= 0}
          className="text-foreground/40 hover:text-foreground hover:bg-muted flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-30"
          aria-label="Back"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={goForward}
          disabled={isBrowsingNative || historyIndex >= history.length - 1}
          className="text-foreground/40 hover:text-foreground hover:bg-muted flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-30"
          aria-label="Forward"
        >
          <ChevronRight size={16} />
        </button>
        <div className="text-foreground/50 flex-1 truncate px-2 text-xs">
          {isBrowsingNative ? nativeFS.currentPath.join(' / ') : (currentFolder?.name ?? 'Desktop')}
        </div>
        <button
          onClick={cycleSort}
          className="text-foreground/40 hover:text-foreground hover:bg-muted flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[10px] font-medium transition-colors"
          aria-label={`Sort by ${sortLabels[sortBy]}`}
        >
          <ArrowUpDown size={12} />
          {sortLabels[sortBy]}
        </button>
        <button
          onClick={isBrowsingNative ? handleNativeNewFolder : handleNewFolder}
          className="text-foreground/40 hover:text-foreground hover:bg-muted flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          aria-label="New Folder"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="border-border/20 hidden w-44 shrink-0 overflow-y-auto border-r p-2 md:block">
          <div className="text-foreground/30 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider">
            Favorites
          </div>
          {sidebarLocations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => handleSidebarNav(loc.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
                !isBrowsingNative && currentFolderId === loc.id
                  ? 'bg-muted text-foreground'
                  : 'text-foreground/60 hover:text-foreground hover:bg-muted/50',
              )}
            >
              <FolderOpen size={16} className="text-foreground/40 shrink-0" />
              <span className="truncate">{loc.name}</span>
            </button>
          ))}

          <div className="text-foreground/30 mt-3 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider">
            Locations
          </div>

          {!nativeFS.isSupported ? (
            <div className="text-foreground/30 px-2 py-1.5 text-[11px] italic">
              Not supported in this browser
            </div>
          ) : (
            <>
              {nativeFS.drives.map((drive) => (
                <div key={drive.id} className="flex items-center gap-1">
                  <button
                    onClick={() => handleDriveSwitch(drive.id)}
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
                      nativeFS.activeDriveId === drive.id
                        ? 'bg-muted text-foreground'
                        : 'text-foreground/60 hover:text-foreground hover:bg-muted/50',
                    )}
                  >
                    <Disc size={16} className="text-foreground/40 shrink-0" />
                    <span className="truncate">{drive.name}</span>
                  </button>
                  <button
                    onClick={() => nativeFS.unmountDrive(drive.id)}
                    className="text-foreground/30 flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-red-500/10 hover:text-red-400"
                    aria-label={`Eject ${drive.name}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => nativeFS.mountDrive()}
                className="text-foreground/50 hover:text-foreground hover:bg-muted/50 mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors"
              >
                <HardDrive size={16} className="text-foreground/40 shrink-0" />
                <span className="truncate">Mount Drive</span>
              </button>
            </>
          )}
        </div>

        <div
          className="flex-1 overflow-auto p-4"
          onContextMenu={isBrowsingNative ? handleNativeEmptyContextMenu : handleEmptyContextMenu}
        >
          {isBrowsingNative ? (
            nativeFS.loading ? (
              <div className="text-foreground/30 flex h-full items-center justify-center text-sm">
                Loading...
              </div>
            ) : nativeFS.entries.length === 0 ? (
              <div className="text-foreground/30 flex h-full items-center justify-center text-sm">
                This folder is empty
              </div>
            ) : (
              <div
                className="grid gap-3"
                onClick={clearSelection}
                style={{
                  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                }}
              >
                {sortedNativeEntries.map((entry) => {
                  const isDir = entry.type === 'directory';
                  const Icon = isDir
                    ? FolderOpen
                    : (typeIconMap[getFileCategory(entry.name)] ?? File);
                  const isSelected = selectedIds.has(entry.name);
                  const cat = getFileCategory(entry.name);
                  return (
                    <motion.button
                      key={entry.name}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick(
                          e,
                          entry.name,
                          sortedNativeEntries.map((x) => x.name),
                        );
                      }}
                      onDoubleClick={() => handleNativeOpenEntry(entry)}
                      onContextMenu={(e) => handleNativeItemContextMenu(e, entry)}
                      className={cn(
                        'flex cursor-default flex-col items-center gap-1.5 rounded-xl p-2 transition-colors duration-100',
                        isSelected ? 'bg-primary/15 ring-primary/30 ring-1' : 'hover:bg-white/5',
                      )}
                    >
                      <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm">
                        {!isDir && IMAGE_CATS.has(cat) ? (
                          <FileThumbnail name={entry.name} icon={Icon} />
                        ) : (
                          <Icon size={24} className="text-foreground/70" strokeWidth={1.5} />
                        )}
                      </div>
                      <span className="text-foreground/60 max-w-full break-words px-1 text-center text-[11px] font-medium leading-tight">
                        {entry.name}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            )
          ) : subItems.length === 0 ? (
            <div className="text-foreground/30 flex h-full items-center justify-center text-sm">
              This folder is empty
            </div>
          ) : (
            <div
              className="grid gap-3"
              onClick={clearSelection}
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
              }}
            >
              {subItems.map((item) => {
                const isDesktop = isDesktopItem(item);
                const Icon = isDesktop ? (iconMap[item.icon] ?? FolderOpen) : getIcon(item);
                const label = getItemLabel(item);
                const isSelected = selectedIds.has(item.id);
                const fi = !isDesktop ? (item as FileItem) : null;
                const cat = fi ? getFileCategory(fi.name) : 'unknown';
                return (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemClick(
                        e,
                        item.id,
                        subItems.map((x) => x.id),
                      );
                    }}
                    onDoubleClick={() => handleDoubleClick(item)}
                    onContextMenu={(e) => handleItemContextMenu(e, item)}
                    className={cn(
                      'flex cursor-default flex-col items-center gap-1.5 rounded-xl p-2 transition-colors duration-100',
                      isSelected ? 'bg-primary/15 ring-primary/30 ring-1' : 'hover:bg-white/5',
                    )}
                  >
                    <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm">
                      {fi && IMAGE_CATS.has(cat) ? (
                        <FileThumbnail name={fi.name} blobId={fi.id} icon={Icon} />
                      ) : (
                        <Icon size={24} className="text-foreground/70" strokeWidth={1.5} />
                      )}
                    </div>
                    <span className="text-foreground/60 max-w-full break-words px-1 text-center text-[11px] font-medium leading-tight">
                      {label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
