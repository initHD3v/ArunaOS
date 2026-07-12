'use client';

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { ArunaEngine, type EngineStatus } from '@arunaos/engine';

interface EngineContextValue {
  engine: ArunaEngine | null;
  status: EngineStatus;
  ready: boolean;
}

const EngineContext = createContext<EngineContextValue>({
  engine: null,
  status: 'booting',
  ready: false,
});

export function ArunaEngineProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<ArunaEngine | null>(null);
  const [status, setStatus] = useState<EngineStatus>('booting');

  useEffect(() => {
    const engine = new ArunaEngine({ proactiveMode: 'balanced' });
    engineRef.current = engine;

    engine.onStatusChange(setStatus);

    engine.boot().then(() => {
      engine.activate();
    });

    return () => {
      engine.sleep();
    };
  }, []);

  return (
    <EngineContext.Provider
      value={{
        engine: engineRef.current,
        status,
        ready: status === 'ready' || status === 'active',
      }}
    >
      {children}
    </EngineContext.Provider>
  );
}

export function useArunaEngine(): EngineContextValue {
  return useContext(EngineContext);
}
