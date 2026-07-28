'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useAuthStore } from '@/stores/auth.store';
import { LoginScreen } from './login-screen';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthEnabled, isLocked, hasSession } = useAuthStore();
  const [hydrated, setHydrated] = useState(useAuthStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    return () => unsub();
  }, []);

  if (!hydrated) {
    return <div className="bg-background fixed inset-0" />;
  }

  const blocked = isAuthEnabled && (!hasSession || isLocked);

  return (
    <>
      <AnimatePresence>{blocked && <LoginScreen />}</AnimatePresence>
      {children}
    </>
  );
}
