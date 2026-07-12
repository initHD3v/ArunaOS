'use client';

import type { ReactNode } from 'react';
import { QueryProvider } from '@/providers/query-provider';
import { WorkspaceProvider } from '@/providers/workspace-provider';
import { ServiceProvider } from '@/providers/service-provider';
import { ArunaEngineProvider } from '@/features/engine/engine-context';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ServiceProvider>
      <ArunaEngineProvider>
        <QueryProvider>
          <WorkspaceProvider>{children}</WorkspaceProvider>
        </QueryProvider>
      </ArunaEngineProvider>
    </ServiceProvider>
  );
}
