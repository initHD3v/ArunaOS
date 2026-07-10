'use client';

import { motion } from 'motion/react';
import { X, Sparkles } from 'lucide-react';

interface AboutOverlayProps {
  onClose: () => void;
}

export function AboutOverlay({ onClose }: AboutOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="border-border/40 bg-background relative mx-4 flex w-full max-w-sm flex-col items-center overflow-hidden rounded-2xl border shadow-2xl shadow-black/10"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="text-foreground/30 hover:text-foreground/60 absolute right-3 top-3 z-10 rounded-lg p-1 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Decorative header */}
        <div className="relative flex w-full items-center justify-center pb-6 pt-10">
          <div className="absolute inset-0 bg-gradient-to-b from-violet-500/10 via-fuchsia-500/5 to-transparent" />
          <div className="absolute left-1/2 top-4 h-24 w-24 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="ring-border/20 relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl ring-1">
            <img src="/logo.png" alt="ArunaOS" className="h-full w-full object-contain" />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center gap-1 px-8 pb-3">
          <h1 className="text-foreground text-xl font-semibold tracking-tight">ArunaOS</h1>
          <p className="text-foreground/40 text-xs">Version 0.3.0 — Phase 4</p>
        </div>

        <p className="text-foreground/50 max-w-xs px-8 text-center text-xs leading-relaxed">
          A web-based operating environment that puts AI at the center of your workspace. Built with
          Next.js, React, and Zustand.
        </p>

        <div className="via-border/60 my-5 h-px w-16 bg-gradient-to-r from-transparent to-transparent" />

        <div className="flex flex-col items-center gap-1 pb-6">
          <Sparkles size={14} className="text-foreground/30" />
          <p className="text-foreground/30 text-[11px]">Created by INITHD3V</p>
          <p className="text-foreground/20 text-[11px]">&copy; 2026 ArunaOS</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
