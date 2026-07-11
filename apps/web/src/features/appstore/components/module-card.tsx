'use client';

import { cn } from '@/lib/utils';
import {
  Star,
  Download,
  BadgeCheck,
  Folder,
  Settings,
  Activity,
  Camera,
  Sparkles,
  Brush,
  Bomb,
  Code,
  CheckSquare,
  Music,
  Grid3X3,
  Globe,
} from 'lucide-react';
import type { RegistryModuleInfo } from '@arunaos/runtime';

const ICON_MAP: Record<string, React.ElementType> = {
  folder: Folder,
  settings: Settings,
  activity: Activity,
  camera: Camera,
  sparkles: Sparkles,
  brush: Brush,
  bomb: Bomb,
  code: Code,
  checklist: CheckSquare,
  music: Music,
  grid: Grid3X3,
  globe: Globe,
};

const FALLBACK_ICON = Folder;

interface ModuleCardProps {
  module: RegistryModuleInfo;
  onSelect: (module: RegistryModuleInfo) => void;
  className?: string;
}

export function ModuleCard({ module, onSelect, className }: ModuleCardProps) {
  const Icon = ICON_MAP[module.icon] || FALLBACK_ICON;

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    return (
      <span className="flex items-center gap-0.5">
        {Array.from({ length: full }, (_, i) => (
          <Star key={`full-${i}`} size={10} className="fill-yellow-400 text-yellow-400" />
        ))}
        {half && <Star size={10} className="fill-yellow-400/50 text-yellow-400" />}
        {Array.from({ length: empty }, (_, i) => (
          <Star key={`empty-${i}`} size={10} className="text-foreground/10" />
        ))}
      </span>
    );
  };

  return (
    <button
      onClick={() => onSelect(module)}
      className={cn(
        'group flex w-full flex-col items-start gap-3 rounded-xl border border-border/20 bg-foreground/[0.02] p-4 text-left transition-all hover:border-border/40 hover:bg-foreground/[0.04]',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/10 text-foreground/70 transition-colors group-hover:bg-foreground/15">
          <Icon size={20} />
        </span>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-foreground">{module.name}</span>
            {module.verified && (
              <BadgeCheck size={14} className="shrink-0 text-blue-400" />
            )}
          </div>
          <span className="text-[11px] text-foreground/40">v{module.version}</span>
        </div>
      </div>

      <p className="line-clamp-2 text-xs leading-relaxed text-foreground/50">
        {module.description}
      </p>

      <div className="mt-auto flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          {renderStars(module.rating)}
          <span className="text-[10px] text-foreground/30">{module.rating.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-foreground/30">
          <Download size={10} />
          {module.downloads >= 1000
            ? `${(module.downloads / 1000).toFixed(1)}k`
            : module.downloads}
        </div>
      </div>

      {module.author && (
        <span className="text-[10px] text-foreground/20">by {module.author}</span>
      )}
    </button>
  );
}
