'use client';

import { memo, useCallback, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { loadAccount } from '@/features/settings/components/account-data';

function useTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);
  return time;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

const floatingOrbs = [
  {
    color: 'from-violet-500/60 to-fuchsia-500/30',
    size: 500,
    x: '10%',
    y: '15%',
    duration: 25,
    delay: 0,
  },
  {
    color: 'from-blue-500/50 to-cyan-500/30',
    size: 450,
    x: '75%',
    y: '10%',
    duration: 30,
    delay: 3,
  },
  {
    color: 'from-emerald-500/40 to-teal-500/25',
    size: 380,
    x: '15%',
    y: '70%',
    duration: 28,
    delay: 5,
  },
  {
    color: 'from-amber-500/40 to-orange-500/25',
    size: 350,
    x: '80%',
    y: '75%',
    duration: 32,
    delay: 2,
  },
  {
    color: 'from-rose-500/40 to-pink-500/25',
    size: 300,
    x: '50%',
    y: '85%',
    duration: 22,
    delay: 4,
  },
  {
    color: 'from-indigo-500/45 to-purple-500/30',
    size: 420,
    x: '40%',
    y: '5%',
    duration: 26,
    delay: 1,
  },
];

export const LoginScreen = memo(function LoginScreen() {
  const { username, login } = useAuthStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const now = useTime();

  const account = loadAccount();
  const avatar = account.avatar || '🧑';
  const isImage = avatar.startsWith('data:') || avatar.startsWith('http');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password) return;
      setError('');
      setLoading(true);
      try {
        const ok = await login(password);
        if (ok) {
          setSuccess(true);
        } else {
          setError('Wrong password. Try again.');
          setPassword('');
          setLoading(false);
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
      exit={{ opacity: 0, pointerEvents: 'none' }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-zinc-950"
    >
      {/* Rich gradient base */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-indigo-950/40" />

      {/* Animated gradient orbs */}
      {floatingOrbs.map((orb, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute rounded-full bg-gradient-to-br blur-[100px]"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: [0.5, 0.85, 0.5],
            scale: [1, 1.2, 1],
            x: [0, 40, -30, 0],
            y: [0, -30, 35, 0],
          }}
          transition={{
            duration: orb.duration,
            delay: orb.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/60 via-transparent to-zinc-950/30" />

      {/* Content */}
      <div className="relative flex flex-col items-center gap-12">
        {/* Time */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center gap-1"
        >
          <span className="text-[76px] font-light tracking-tight text-white/90 drop-shadow-lg">
            {formatTime(now)}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-white/50">
            <Clock size={12} />
            {formatDate(now)}
          </span>
        </motion.div>

        {/* Login card */}
        <motion.div
          initial={{ y: 20, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 25 }}
          className="flex flex-col items-center gap-6 rounded-3xl border border-white/[0.08] bg-white/[0.05] px-10 py-8 shadow-2xl shadow-black/30 backdrop-blur-2xl"
        >
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 200 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white/[0.08] ring-1 ring-white/10">
              {isImage ? (
                <img src={avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl">{avatar}</span>
              )}
            </div>
            <span className="text-base font-medium text-white/80">{username}</span>
          </motion.div>

          {/* Password */}
          <motion.form
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            onSubmit={handleSubmit}
            className="flex flex-col items-center gap-3"
          >
            <div className="relative">
              <Lock
                size={14}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20"
              />
              <input
                ref={inputRef}
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                className={cn(
                  'h-10 w-60 rounded-xl border bg-white/[0.06] px-9 text-sm text-white/90 outline-none backdrop-blur-sm transition-all',
                  'placeholder:text-white/20',
                  'border-white/[0.08] focus:border-white/20 focus:ring-2 focus:ring-white/[0.06]',
                  error && 'border-red-400/30',
                )}
                autoFocus
                autoComplete="current-password"
              />
            </div>

            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-green-400"
                >
                  <CheckCircle size={12} />
                  Unlocked
                </motion.div>
              )}
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

            {loading && (
              <div className="flex items-center gap-1.5 text-xs text-white/30">
                <div className="h-3 w-3 animate-spin rounded-full border border-white/20 border-t-white/60" />
                Verifying...
              </div>
            )}
          </motion.form>
        </motion.div>
      </div>
    </motion.div>
  );
});
