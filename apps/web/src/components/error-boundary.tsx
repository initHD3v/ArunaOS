'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { getLogger } from '@/lib/logger-client';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const logger = getLogger();
    logger.error('ErrorBoundary', 'React component error', {
      error: { message: error.message, name: error.name, stack: error.stack },
      componentStack: info.componentStack,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex h-screen items-center justify-center bg-black">
          <div className="max-w-md text-center">
            <h1 className="mb-2 text-xl font-bold text-white">Something went wrong</h1>
            <pre className="mb-4 max-h-32 overflow-auto rounded bg-white/5 p-3 text-left text-xs text-red-400">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
