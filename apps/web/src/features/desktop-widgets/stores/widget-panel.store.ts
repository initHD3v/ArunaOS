'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WidgetId = 'proactive';
export type LayoutMode = 'auto' | 'custom';

export interface WidgetPanelState {
  visible: boolean;
  position: { x: number; y: number };
  width: number;
  widgetOrder: WidgetId[];
  hiddenWidgets: WidgetId[];
  layoutMode: LayoutMode;
  collapsed: boolean;
}

export interface WidgetPanelActions {
  toggle: () => void;
  show: () => void;
  hide: () => void;
  setPosition: (x: number, y: number) => void;
  setWidth: (w: number) => void;
  setWidgetOrder: (order: WidgetId[]) => void;
  toggleWidget: (id: WidgetId) => void;
  showWidget: (id: WidgetId) => void;
  hideWidget: (id: WidgetId) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  toggleCollapsed: () => void;
}

export const useWidgetPanelStore = create<WidgetPanelState & WidgetPanelActions>()(
  persist(
    (set) => ({
      visible: true,
      position: { x: 0, y: 0 },
      width: 340,
      widgetOrder: ['proactive'],
      hiddenWidgets: [],
      layoutMode: 'auto',
      collapsed: false,

      toggle: () => set((s) => ({ visible: !s.visible })),
      show: () => set({ visible: true }),
      hide: () => set({ visible: false }),
      setPosition: (x, y) => set({ position: { x, y } }),
      setWidth: (w) => set({ width: w }),
      setWidgetOrder: (order) => set({ widgetOrder: order, layoutMode: 'custom' }),
      toggleWidget: (id) =>
        set((s) => ({
          hiddenWidgets: s.hiddenWidgets.includes(id)
            ? s.hiddenWidgets.filter((h) => h !== id)
            : [...s.hiddenWidgets, id],
        })),
      showWidget: (id) => set((s) => ({ hiddenWidgets: s.hiddenWidgets.filter((h) => h !== id) })),
      hideWidget: (id) =>
        set((s) => ({
          hiddenWidgets: s.hiddenWidgets.includes(id) ? s.hiddenWidgets : [...s.hiddenWidgets, id],
        })),
      setLayoutMode: (mode) => set({ layoutMode: mode }),
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
    }),
    {
      name: 'arunaos-widget-panel',
      partialize: (state) => ({
        visible: state.visible,
        position: state.position,
        width: state.width,
        widgetOrder: state.widgetOrder,
        hiddenWidgets: state.hiddenWidgets,
        layoutMode: state.layoutMode,
        collapsed: state.collapsed,
      }),
    },
  ),
);
