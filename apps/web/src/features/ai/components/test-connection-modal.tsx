'use client';

import { cn } from '@/lib/utils';
import { X, Loader2, CheckCircle, XCircle, Wifi, WifiOff } from 'lucide-react';

export interface TestStep {
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;
}

interface TestConnectionModalProps {
  open: boolean;
  steps: TestStep[];
  result: 'testing' | 'success' | 'error';
  latency?: string;
  onClose: () => void;
}

export function TestConnectionModal({
  open,
  steps,
  result,
  latency,
  onClose,
}: TestConnectionModalProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={result === 'testing' ? undefined : onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2">
        <div className="border-border/20 bg-card rounded-xl border shadow-2xl">
          {/* Header */}
          <div className="border-border/20 flex items-center justify-between border-b px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              {result === 'testing' ? (
                <Loader2 className="text-primary h-4 w-4 animate-spin" />
              ) : result === 'success' ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <div>
                <h3 className="text-sm font-medium">
                  {result === 'testing'
                    ? 'Testing Connection...'
                    : result === 'success'
                      ? 'Connection Successful'
                      : 'Connection Failed'}
                </h3>
                {latency && (
                  <p className="text-foreground/40 mt-0.5 text-[11px]">Response: {latency}</p>
                )}
              </div>
            </div>
            {result !== 'testing' && (
              <button
                onClick={onClose}
                className="text-foreground/50 hover:text-foreground rounded-md p-1 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Steps */}
          <div className="space-y-0 p-5">
            {steps.map((step, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-3 border-l-2 pb-4 pl-4 last:pb-0',
                  i === steps.length - 1 ? 'border-transparent' : 'border-border/20',
                  step.status === 'running' ? 'border-primary' : '',
                  step.status === 'error' ? 'border-red-500' : '',
                  step.status === 'done' ? 'border-green-500/40' : '',
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {step.status === 'pending' && (
                    <span className="bg-foreground/10 block h-4 w-4 rounded-full" />
                  )}
                  {step.status === 'running' && (
                    <Loader2 className="text-primary h-4 w-4 animate-spin" />
                  )}
                  {step.status === 'done' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {step.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-xs font-medium',
                      step.status === 'pending'
                        ? 'text-foreground/30'
                        : step.status === 'running'
                          ? 'text-primary'
                          : step.status === 'error'
                            ? 'text-red-600'
                            : 'text-foreground/80',
                    )}
                  >
                    {step.label}
                  </p>
                  {step.detail && (
                    <p
                      className={cn(
                        'mt-0.5 break-all font-mono text-[11px] leading-relaxed',
                        step.status === 'error' ? 'text-red-500' : 'text-foreground/40',
                      )}
                    >
                      {step.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          {result !== 'testing' && (
            <div className="border-border/20 border-t px-5 py-3">
              <p
                className={cn('text-xs', result === 'success' ? 'text-green-600' : 'text-red-600')}
              >
                {result === 'success'
                  ? 'Connection verified. You can now save your settings and start using the AI chat.'
                  : 'Check your API key and base URL, then try again.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
