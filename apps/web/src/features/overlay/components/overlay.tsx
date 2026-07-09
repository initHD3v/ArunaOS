'use client';

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useOverlayStore } from '../stores/overlay.store';

export function Overlay() {
  const visible = useOverlayStore((s) => s.visible);
  const content = useOverlayStore((s) => s.content);
  const hideOverlay = useOverlayStore((s) => s.hideOverlay);

  const handleBackdropClick = useCallback(() => {
    hideOverlay();
  }, [hideOverlay]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/20 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <div onClick={(e) => e.stopPropagation()}>{content}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
