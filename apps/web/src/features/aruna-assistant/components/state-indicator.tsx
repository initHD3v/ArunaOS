'use client';

import { motion } from 'motion/react';
import type { AssistantState } from '../engines/types';

export function StateIndicator({ state }: { state: AssistantState }) {
  if (state === 'idle' || state === 'observing' || state === 'sleeping') return null;

  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{ backgroundColor: '#5D6BFF10' }}
    >
      {state === 'thinking' && (
        <motion.div
          className="flex items-center gap-0.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.span
            className="h-1 w-1 rounded-full"
            style={{ backgroundColor: '#5D6BFF' }}
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="h-1 w-1 rounded-full"
            style={{ backgroundColor: '#5D6BFF' }}
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
          />
          <motion.span
            className="h-1 w-1 rounded-full"
            style={{ backgroundColor: '#5D6BFF' }}
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
          />
          <span className="ml-1 text-[9px] font-medium" style={{ color: '#5D6BFF' }}>
            Memikirkan...
          </span>
        </motion.div>
      )}
      {state === 'planning' && (
        <span className="text-[9px] font-medium" style={{ color: '#FFB340' }}>
          Merencanakan...
        </span>
      )}
      {state === 'executing' && (
        <motion.span
          className="text-[9px] font-medium"
          style={{ color: '#30D158' }}
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          Menjalankan...
        </motion.span>
      )}
      {state === 'speaking' && (
        <span className="text-[9px] font-medium" style={{ color: '#5D6BFF' }}>
          Menjawab...
        </span>
      )}
      {state === 'listening' && (
        <motion.span
          className="text-[9px] font-medium"
          style={{ color: '#5D6BFF' }}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Mendengarkan...
        </motion.span>
      )}
    </div>
  );
}
