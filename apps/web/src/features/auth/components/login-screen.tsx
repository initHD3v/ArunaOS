'use client';

import { memo, useCallback, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Monitor, Lock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

export const LoginScreen = memo(function LoginScreen() {
  const { username, isLocked, login } = useAuthStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);
      try {
        const ok = await login(password);
        if (!ok) {
          setError('Wrong password. Try again.');
          setPassword('');
        }
      } finally {
        setLoading(false);
      }
    },
    [password, login],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="from-background via-background to-background/95 fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b"
    >
      <div className="flex flex-col items-center gap-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
          className="from-primary/30 to-primary/10 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br shadow-lg backdrop-blur-sm"
        >
          <Monitor size={48} className="text-primary/70" />
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex flex-col items-center gap-1"
        >
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">ArunaOS</h1>
          <p className="text-foreground/40 text-xs">AI-Native Operating Workspace</p>
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="from-primary/20 to-primary/5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br">
            <span className="text-foreground text-lg font-semibold">
              {username.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-foreground text-base font-medium">{username}</span>
        </motion.div>

        <motion.form
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45 }}
          onSubmit={handleSubmit}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <Lock
              size={14}
              className="text-foreground/30 pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            />
            <input
              ref={inputRef}
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(
                'bg-muted/50 border-border/40 w-64 rounded-xl border px-9 py-2.5 text-sm outline-none transition-colors',
                'placeholder:text-foreground/25',
                'focus:border-primary/50 focus:ring-primary/20 focus:ring-2',
                error && 'border-red-400/50',
              )}
              autoFocus
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-1.5 text-xs text-red-400"
              >
                <AlertCircle size={12} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading || !password}
            className={cn(
              'bg-foreground/10 hover:bg-foreground/15 text-foreground/80 w-64 rounded-xl py-2.5 text-sm font-medium transition-colors',
              'disabled:pointer-events-none disabled:opacity-40',
            )}
          >
            {loading ? 'Logging in...' : isLocked ? 'Unlock' : 'Log In'}
          </button>
        </motion.form>
      </div>

      <div className="pointer-events-none fixed bottom-8 text-center">
        <p className="text-foreground/20 text-[11px]">
          ArunaOS v0.2.0 &mdash; Made with Next.js + Zustand
        </p>
      </div>
    </motion.div>
  );
});
