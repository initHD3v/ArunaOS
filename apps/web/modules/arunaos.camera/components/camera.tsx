'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-media-query';
import { useCameraStore, FILTERS } from '../stores/camera.store';
import { useCameraStream } from '../hooks/use-camera-stream';
import { useMediaRecorder } from '../hooks/use-media-recorder';
import { Viewfinder } from './viewfinder';
import { ShutterBar } from './shutter';
import { Gallery, type CapturedMedia } from './gallery';
import { PermissionDenied } from './permissions';

const DB_NAME = 'aruna-camera';
const STORE = 'media';

function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function saveToDB(m: CapturedMedia) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ id: m.id, type: m.type, timestamp: m.timestamp, blob: m.blob });
    db.close();
  } catch (_e) {
    /* ignore indexedDB put */
  }
}
async function loadFromDB(): Promise<CapturedMedia[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    const all: { id: string; type: 'photo' | 'video'; timestamp: number; blob: Blob }[] =
      await new Promise((res, rej) => {
        req.onsuccess = () => res(req.result as never);
        req.onerror = () => rej(req.error);
      });
    db.close();
    return all.map((r) => ({ ...r, url: URL.createObjectURL(r.blob) }));
  } catch (_e) {
    return [];
  }
}
async function deleteFromDB(id: string) {
  try {
    const db = await openDB();
    db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
    db.close();
  } catch (_e) {
    /* ignore */
  }
}
async function clearDB() {
  try {
    const db = await openDB();
    db.transaction(STORE, 'readwrite').objectStore(STORE).clear();
    db.close();
  } catch (_e) {
    /* ignore */
  }
}

export const CameraApp = memo(function CameraApp() {
  const isMobile = useIsMobile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    mode,
    timer,
    showGrid,
    mirror,
    flash,
    filter,
    zoom,
    setMode,
    setTimer,
    toggleGrid,
    toggleMirror,
    toggleFlash,
    setFilter,
    setZoom,
  } = useCameraStore();
  const [activeDeviceId, setActiveDeviceId] = useState('');
  const { devices, error, setError, streamReady, initializing, streamRef, start, stop } =
    useCameraStream(videoRef, mode);
  const { recording, recordingTime, start: startRec, stop: stopRec } = useMediaRecorder(streamRef);
  const [countdown, setCountdown] = useState(0);
  const [media, setMedia] = useState<CapturedMedia[]>([]);
  const [flashOn, setFlashOn] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // load persisted gallery
  useEffect(() => {
    loadFromDB().then((items) => {
      if (items.length) setMedia(items.sort((a, b) => b.timestamp - a.timestamp));
    });
    return () => media.forEach((m) => URL.revokeObjectURL(m.url));
  }, []);

  useEffect(() => {
    start();
    return () => stop();
  }, [start, stop]);

  useEffect(() => {
    if (activeDeviceId) start(activeDeviceId);
  }, [activeDeviceId, start]);

  // keyboard: Space to capture, H to hide controls
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        handleCapture();
      }
      if ((e.key === 'h' || e.key === 'H') && !error) {
        e.preventDefault();
        setShowControls((v) => !v);
      }
      if (e.key === 'Escape' && error) setError('');
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const switchCamera = useCallback(() => {
    if (devices.length < 2) return;
    const idx = devices.findIndex((d) => d.deviceId === activeDeviceId);
    const nxt = devices[(idx + 1) % devices.length];
    if (nxt) setActiveDeviceId(nxt.deviceId);
  }, [devices, activeDeviceId]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const css = FILTERS.find((f) => f.id === filter)?.css;
    if (css) ctx.filter = css;
    // mirror front camera
    if (mirror) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    setFlashOn(true);
    setTimeout(() => setFlashOn(false), 280);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const item: CapturedMedia = {
          id: `photo-${Date.now()}`,
          type: 'photo',
          blob,
          url,
          timestamp: Date.now(),
        };
        setMedia((p) => [item, ...p]);
        saveToDB(item);
      },
      'image/jpeg',
      0.92,
    );
  }, [filter, mirror]);

  const handleCapture = useCallback(() => {
    if (mode === 'photo') {
      if (timer > 0) {
        let rem = timer;
        setCountdown(rem);
        const id = setInterval(() => {
          rem -= 1;
          if (rem <= 0) {
            clearInterval(id);
            setCountdown(0);
            capturePhoto();
          } else setCountdown(rem);
        }, 1000);
      } else capturePhoto();
    } else {
      if (recording) stopRec();
      else
        startRec((blob) => {
          const url = URL.createObjectURL(blob);
          const item: CapturedMedia = {
            id: `video-${Date.now()}`,
            type: 'video',
            blob,
            url,
            timestamp: Date.now(),
          };
          setMedia((p) => [item, ...p]);
          saveToDB(item);
        });
    }
  }, [mode, timer, capturePhoto, recording, startRec, stopRec]);

  const downloadMedia = useCallback((m: CapturedMedia) => {
    const a = document.createElement('a');
    a.href = m.url;
    a.download = m.type === 'photo' ? `${m.id}.jpg` : `${m.id}.webm`;
    a.click();
  }, []);

  const deleteMedia = useCallback((id: string) => {
    setMedia((p) => {
      const f = p.find((m) => m.id === id);
      if (f) URL.revokeObjectURL(f.url);
      return p.filter((m) => m.id !== id);
    });
    deleteFromDB(id);
  }, []);

  const clearAll = useCallback(() => {
    media.forEach((m) => URL.revokeObjectURL(m.url));
    setMedia([]);
    clearDB();
  }, [media]);

  const formatClock = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (!mounted) {
    return (
      <div className="bg-background flex h-full items-center justify-center">
        <div className="border-foreground/20 border-t-foreground h-8 w-8 animate-spin rounded-full border-2" />
      </div>
    );
  }

  return (
    <div className="bg-background flex h-full flex-col overflow-hidden">
      {/* Viewfinder — flex-1, more transparent controls below, double-click to toggle settings */}
      <div
        className="relative flex flex-1 flex-col overflow-hidden"
        onDoubleClick={() => setShowControls((v) => !v)}
      >
        <Viewfinder
          videoRef={videoRef}
          canvasRef={canvasRef}
          streamReady={streamReady}
          initializing={initializing}
          showGrid={showGrid}
          mirror={mirror}
          filter={filter}
          zoom={zoom}
          flash={flashOn}
          countdown={countdown}
          onZoom={setZoom}
        />

        {/* Recording indicator — centered top, not blocking window controls (window title is outside) */}
        {recording && (
          <div className="pointer-events-none absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-red-500/90 px-3 py-1 text-xs font-medium text-white shadow-lg backdrop-blur-md">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            {formatClock(recordingTime)} • REC
          </div>
        )}

        {/* Floating show button when settings hidden */}
        <AnimatePresence>
          {!showControls && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={() => setShowControls(true)}
              className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md hover:bg-black/60"
            >
              <Eye size={12} /> Show settings
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Shutter — always visible, more transparent, hide toggle inside */}
      <ShutterBar
        mode={mode}
        timer={timer}
        showGrid={showGrid}
        filter={filter}
        mirror={mirror}
        flash={flash}
        recording={recording}
        devicesCount={devices.length}
        showSettings={showControls}
        onCapture={handleCapture}
        onToggleMode={() => setMode(mode === 'photo' ? 'video' : 'photo')}
        onTimer={() => setTimer(timer === 0 ? 3 : timer === 3 ? 10 : 0)}
        onGrid={toggleGrid}
        onFilter={setFilter}
        onMirror={toggleMirror}
        onFlash={toggleFlash}
        onFlip={switchCamera}
        onToggleSettings={() => setShowControls((v) => !v)}
        isMobile={!!isMobile}
      />

      {/* Gallery — collapsible, hide to maximize viewfinder */}
      <AnimatePresence initial={false}>
        {showControls && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="shrink-0 overflow-hidden"
          >
            <Gallery
              media={media}
              onDownload={downloadMedia}
              onDelete={deleteMedia}
              onClear={clearAll}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <PermissionDenied
          message={error}
          onRetry={() => start(activeDeviceId || undefined)}
          onDismiss={() => setError('')}
        />
      )}
    </div>
  );
});
