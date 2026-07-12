'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Loader } from 'lucide-react';
import { useLocationStore } from '@/stores/location.store';

export function LocationPermissionDialog() {
  const { permissionAsked, loading, requestPermission } = useLocationStore();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!permissionAsked) {
      const timer = setTimeout(() => setShow(true), 500);
      return () => clearTimeout(timer);
    }
  }, [permissionAsked]);

  function handleAccept() {
    requestPermission().then(() => setShow(false));
  }

  function handleDeny() {
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="border-border/30 bg-card w-80 rounded-xl border shadow-xl"
          >
            <div className="p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                  <MapPin size={18} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-foreground text-sm font-medium">Layanan Lokasi</h2>
                  <p className="text-foreground/40 text-[10px]">ArunaOS</p>
                </div>
              </div>

              <p className="text-foreground/60 mb-4 text-[11px] leading-relaxed">
                ArunaOS ingin mengakses lokasi Anda untuk memberikan informasi cuaca yang akurat dan
                saran yang lebih relevan berdasarkan posisi Anda.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={handleDeny}
                  disabled={loading}
                  className="text-foreground/50 hover:text-foreground/70 bg-muted hover:bg-muted/80 flex-1 rounded-lg px-3 py-2 text-[11px] transition-colors disabled:opacity-40"
                >
                  Tolak
                </button>
                <button
                  onClick={handleAccept}
                  disabled={loading}
                  className="bg-primary hover:bg-primary/90 flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] text-white transition-colors disabled:opacity-60"
                >
                  {loading && <Loader size={10} className="animate-spin" />}
                  {loading ? 'Meminta izin...' : 'Izinkan'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
