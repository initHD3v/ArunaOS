import {
  Sparkles,
  FolderOpen,
  Settings,
  Camera,
  Activity,
  Grid3X3,
  Monitor,
  Code2,
  ShoppingBag,
  FileText,
  type LucideIcon,
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  folder: FolderOpen,
  settings: Settings,
  camera: Camera,
  activity: Activity,
  grid: Grid3X3,
  monitor: Monitor,
  code: Code2,
  appstore: ShoppingBag,
  file: FileText,
};

export function getIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] ?? FileText;
}
