'use client';

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { ArunaEngine, type EngineStatus } from '@arunaos/engine';
import { getArunaCore, resetArunaCore } from '@/features/aruna-assistant/engines/aruna-core';
import { bridgeArunaEngine } from '@/features/aruna-assistant/engines/engine-bridge';

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
  const aliveRef = useRef(true);

  useEffect(() => {
    const engine = new ArunaEngine({ proactiveMode: 'balanced' });
    engineRef.current = engine;
    aliveRef.current = true;

    const unsubStatus = engine.onStatusChange(setStatus);

    engine
      .boot()
      .then(() => {
        if (!aliveRef.current) return;
        const core = getArunaCore();
        const cleanupBridge = bridgeArunaEngine(engine, core);
        if (!aliveRef.current) {
          cleanupBridge();
          resetArunaCore();
          return;
        }
        engine.activate();
      })
      .catch((e: unknown) => {
        console.warn('[ArunaEngine] Boot failed:', e);
        if (aliveRef.current) setStatus('error' as EngineStatus);
      });

    return () => {
      aliveRef.current = false;
      unsubStatus();
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
