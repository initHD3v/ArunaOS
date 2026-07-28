import { MENUBAR_HEIGHT, APP_PAD } from '@/constants/layout';

export function createWindowConfig(
  defaultWidth: number,
  defaultHeight: number,
): { width: number; height: number; x: number; y: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(defaultWidth, vw - APP_PAD * 2);
  const height = Math.min(defaultHeight, vh - MENUBAR_HEIGHT - APP_PAD);
  const x = Math.round((vw - width) / 2);
  const y = MENUBAR_HEIGHT + Math.round((vh - MENUBAR_HEIGHT - height) / 2);
  return { width, height, x, y };
}
