export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type WindowState =
  'active' | 'inactive' | 'dragging' | 'resizing' | 'minimized' | 'maximized';

export interface WindowData {
  id: string;
  title: string;
  icon: string;
  position: Position;
  size: Size;
  zIndex: number;
  state: WindowState;
  appId: string;
  appData?: Record<string, unknown>;
}

export interface DesktopIconData {
  id: string;
  title: string;
  icon: string;
  position: number;
  appId: string;
}

export interface SelectionRect {
  start: Position;
  current: Position;
}

export interface ContextMenuItem {
  id: string;
  label: string;
  action: () => void;
  separator?: boolean;
}

export interface ContextMenuState {
  visible: boolean;
  position: Position;
  items: ContextMenuItem[];
}

export interface WorkspaceData {
  id: string;
  name: string;
  activeWindowId: string | null;
}
