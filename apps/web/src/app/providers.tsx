'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from '@/providers/theme-provider';
import { QueryProvider } from '@/providers/query-provider';
import { WorkspaceProvider } from '@/providers/workspace-provider';
import { ServiceProvider } from '@/providers/service-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ServiceProvider>
      <ThemeProvider>
        <QueryProvider>
          <WorkspaceProvider>{children}</WorkspaceProvider>
        </QueryProvider>
      </ThemeProvider>
    </ServiceProvider>
  );
}
