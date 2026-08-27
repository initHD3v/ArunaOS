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
        <div className="bg-background flex h-screen items-center justify-center">
          <div className="max-w-md text-center">
            <h1 className="text-foreground mb-2 text-xl font-bold">Something went wrong</h1>
            <pre className="bg-muted mb-4 max-h-32 overflow-auto rounded p-3 text-left text-xs text-red-400">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="bg-muted text-foreground hover:bg-muted/80 rounded-lg px-4 py-2 text-sm transition-colors"
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
