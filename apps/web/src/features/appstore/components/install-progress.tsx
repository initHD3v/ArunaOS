'use client';


import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Shield,
  FileCode,
  Package,
  Trash2,
} from 'lucide-react';

export interface InstallStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;
  progress?: number;
}

interface InstallProgressProps {
  title: string;
  subtitle: string;
  steps: InstallStep[];
  onClose?: () => void;
  type: 'install' | 'uninstall';
}

function StepIcon({ step }: { step: InstallStep }) {
  if (step.status === 'done') return <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />;
  if (step.status === 'error') return <XCircle size={16} className="shrink-0 text-red-400" />;
  if (step.status === 'running') return <Loader2 size={16} className="shrink-0 animate-spin text-blue-400" />;
  return <div className="h-4 w-4 shrink-0 rounded-full border-2 border-foreground/20" />;
}

const STEP_ICONS: Record<string, React.ElementType> = {
  fetch: Download,
  verify: Shield,
  extract: FileCode,
  register: Package,
  unregister: Package,
  cleanup: Trash2,
};

export function InstallProgress({ title, subtitle, steps, onClose, type }: InstallProgressProps) {
  const doneCount = steps.filter((s) => s.status === 'done').length;
  const totalCount = steps.length;
  const overallProgress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const allDone = steps.every((s) => s.status === 'done');
  const hasError = steps.some((s) => s.status === 'error');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-border/40 bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl',
              type === 'install'
                ? 'bg-blue-500/15 text-blue-400'
                : 'bg-red-500/15 text-red-400',
            )}>
              {type === 'install' ? <Download size={22} /> : <Trash2 size={22} />}
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
              <p className="text-xs text-foreground/50">{subtitle}</p>
            </div>
          </div>
          {(allDone || hasError) && onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-foreground/30 transition-colors hover:bg-foreground/10 hover:text-foreground/60"
            >
              <XCircle size={16} />
            </button>
          )}
        </div>

        {!allDone && !hasError && (
          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-foreground/50">Progress</span>
              <span className="font-medium text-foreground/70">{overallProgress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500 ease-out"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          {steps.map((step, _i) => {
            const StepIconComponent = STEP_ICONS[step.id];
            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                  step.status === 'running' && 'bg-foreground/5',
                  step.status === 'error' && 'bg-red-500/10',
                  step.status === 'done' && 'bg-emerald-500/5',
                )}
              >
                {StepIconComponent && step.status === 'running' ? (
                  <StepIconComponent size={14} className="shrink-0 text-blue-400" />
                ) : (
                  <StepIcon step={step} />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-sm',
                      step.status === 'done' && 'text-emerald-400/80',
                      step.status === 'error' && 'text-red-400',
                      step.status === 'running' && 'text-foreground',
                      step.status === 'pending' && 'text-foreground/40',
                    )}>
                      {step.label}
                    </span>
                    {step.status === 'running' && step.progress !== undefined && (
                      <span className="text-[11px] text-foreground/40">{step.progress}%</span>
                    )}
                  </div>
                  {step.detail && (
                    <p className="mt-0.5 truncate text-[11px] text-foreground/40">{step.detail}</p>
                  )}
                </div>

                {step.status === 'running' && step.progress !== undefined && (
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-foreground/10">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${step.progress}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {allDone && (
          <div className="mt-4 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-center">
            <p className="text-sm font-medium text-emerald-400">
              {type === 'install' ? 'Module installed successfully' : 'Module uninstalled successfully'}
            </p>
          </div>
        )}

        {hasError && (
          <div className="mt-4 space-y-1.5 rounded-xl bg-red-500/10 px-3 py-2.5">
            <p className="text-sm font-medium text-red-400">Installation failed</p>
            {steps.filter((s) => s.status === 'error').map((s) => (
              <p key={s.id} className="text-xs text-red-400/70">{s.detail}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
