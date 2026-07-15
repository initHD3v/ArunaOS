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
    aliveRef.current = true;
    const enginesToClean: ArunaEngine[] = [];

    const attemptBoot = (retryCount = 0): void => {
      if (!aliveRef.current) return;

      const engine = new ArunaEngine({ proactiveMode: 'balanced' });
      engineRef.current = engine;
      enginesToClean.push(engine);

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
          console.warn(`[ArunaEngine] Boot attempt ${retryCount + 1}/3 failed:`, e);
          unsubStatus();
          if (!aliveRef.current) return;

          if (retryCount < 2) {
            setTimeout(() => attemptBoot(retryCount + 1), 1000 * (retryCount + 1));
          } else {
            engine
              .getMemoryStore()
              .clear()
              .then(() => {
                const final = new ArunaEngine({ proactiveMode: 'balanced' });
                engineRef.current = final;
                enginesToClean.push(final);
                const unsubFinal = final.onStatusChange(setStatus);
                final
                  .boot()
                  .then(() => {
                    if (!aliveRef.current) return;
                    const core = getArunaCore();
                    const cleanupBridge = bridgeArunaEngine(final, core);
                    if (!aliveRef.current) {
                      cleanupBridge();
                      resetArunaCore();
                      return;
                    }
                    final.activate();
                  })
                  .catch((e2: unknown) => {
                    console.warn('[ArunaEngine] All boot attempts failed:', e2);
                    unsubFinal();
                    if (aliveRef.current) setStatus('error' as EngineStatus);
                  });
              })
              .catch(() => {
                if (aliveRef.current) setStatus('error' as EngineStatus);
              });
          }
        });
    };

    attemptBoot();

    return () => {
      aliveRef.current = false;
      for (const e of enginesToClean) {
        try {
          e.sleep();
        } catch {
          /* ignore */
        }
      }
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
