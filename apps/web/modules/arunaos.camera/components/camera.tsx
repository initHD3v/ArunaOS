'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Video, RotateCcw, Timer, Grid3X3, Download, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Mode = 'photo' | 'video';
type TimerDuration = 0 | 3 | 10;

interface CapturedMedia {
  id: string;
  type: 'photo' | 'video';
  blob: Blob;
  url: string;
  timestamp: number;
}

function formatTimestamp(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export const CameraApp = memo(function CameraApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [mounted, setMounted] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('');
  const [mode, setMode] = useState<Mode>('photo');
  const [timer, setTimer] = useState<TimerDuration>(0);
  const [showGrid, setShowGrid] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [media, setMedia] = useState<CapturedMedia[]>([]);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState('');
  const [streamReady, setStreamReady] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startStream = useCallback(
    async (deviceId?: string) => {
      stopCurrentStream();
      setStreamReady(false);
      setError('');

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError(
            'Camera access requires HTTPS or localhost. Please open ArunaOS via https:// or http://localhost.',
          );
          return;
        }

        const constraints: MediaStreamConstraints = {
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
          audio: mode === 'video',
        };
        const s = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = s;

        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }

        setStreamReady(true);

        // enumerate available cameras now that we have permission
        const devs = await navigator.mediaDevices.enumerateDevices();
        const cams = devs.filter((d) => d.kind === 'videoinput');
        setDevices(cams);

        if (!deviceId && cams.length > 0 && cams[0]) {
          setActiveDeviceId(cams[0].deviceId);
        }
      } catch (err: unknown) {
        const e = err as DOMException;
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
          setError('Camera access denied. Please allow camera permissions in your browser.');
        } else {
          setError('Could not access camera: ' + e.message);
        }
      }
      setInitializing(false);
    },
    [mode, stopCurrentStream],
  );

  // wait for client mount (SSR guard)
  useEffect(() => {
    setMounted(true);
  }, []);

  // initial camera start
  useEffect(() => {
    startStream();
    return () => {
      stopCurrentStream();
      media.forEach((m) => URL.revokeObjectURL(m.url));
    };
  }, []);

  // switch camera when deviceId changes
  useEffect(() => {
    if (!activeDeviceId) return;
    startStream(activeDeviceId);
  }, [activeDeviceId, startStream]);

  // recording timer
  useEffect(() => {
    if (!recording) {
      setRecordingTime(0);
      return;
    }
    const id = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  const formatClock = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const switchCamera = useCallback(() => {
    if (devices.length < 2) return;
    const idx = devices.findIndex((d) => d.deviceId === activeDeviceId);
    const next = (idx + 1) % devices.length;
    const nextDevice = devices[next];
    if (!nextDevice) return;
    setActiveDeviceId(nextDevice.deviceId);
    setStreamReady(false);
  }, [devices, activeDeviceId]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const id = `photo-${Date.now()}`;
      setMedia((prev) => [{ id, type: 'photo', blob, url, timestamp: Date.now() }, ...prev]);
    }, 'image/png');
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const id = `video-${Date.now()}`;
        setMedia((prev) => [{ id, type: 'video', blob, url, timestamp: Date.now() }, ...prev]);
        chunksRef.current = [];
      };

      recorder.start();
      setRecording(true);
    } catch {
      setError('Video recording is not supported in this browser.');
    }
  }, []);

  const handleCaptureClick = useCallback(() => {
    if (mode === 'photo') {
      if (timer > 0) {
        setCountdown(timer);
        let remaining = timer;
        const id = setInterval(() => {
          remaining--;
          if (remaining <= 0) {
            clearInterval(id);
            setCountdown(0);
            capturePhoto();
          } else {
            setCountdown(remaining);
          }
        }, 1000);
      } else {
        capturePhoto();
      }
    } else {
      if (recording) {
        mediaRecorderRef.current?.stop();
        setRecording(false);
      } else {
        startRecording();
      }
    }
  }, [mode, timer, capturePhoto, recording, startRecording]);

  const downloadMedia = useCallback((item: CapturedMedia) => {
    const a = document.createElement('a');
    a.href = item.url;
    a.download = item.type === 'photo' ? `photo-${item.id}.png` : `video-${item.id}.webm`;
    a.click();
  }, []);

  const deleteMedia = useCallback((id: string) => {
    setMedia((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return prev.filter((m) => m.id !== id);
    });
  }, []);

  if (!mounted) {
    return (
      <div className="bg-background/40 flex h-full items-center justify-center">
        <div className="border-foreground/20 border-t-foreground/60 h-8 w-8 animate-spin rounded-full border-2" />
      </div>
    );
  }

  return (
    <div className="bg-background/40 flex h-full flex-col">
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black/90">
        {initializing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            'h-full w-full object-cover transition-opacity duration-300',
            streamReady ? 'opacity-100' : 'opacity-0',
          )}
        />

        {showGrid && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute bottom-0 left-1/3 right-2/3 top-0 border-l border-r border-white/15" />
            <div className="absolute bottom-2/3 left-0 right-0 top-1/3 border-b border-t border-white/15" />
          </div>
        )}

        {countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-8xl font-light tabular-nums text-white/80 drop-shadow-2xl">
              {countdown}
            </span>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-none absolute inset-0 bg-white"
            />
          )}
        </AnimatePresence>

        <div className="pointer-events-none absolute inset-x-0 top-3 flex items-center justify-center gap-3">
          <div
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium backdrop-blur-md transition-all',
              recording ? 'bg-red-500/30 text-red-300' : 'bg-black/30 text-white/60',
            )}
          >
            {recording ? (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
                {formatClock(recordingTime)}
              </span>
            ) : (
              <span>{mode === 'photo' ? 'Photo' : 'Video'}</span>
            )}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-6 p-4">
          <button
            onClick={() => setShowGrid((p) => !p)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-all',
              showGrid ? 'bg-white/20 text-white' : 'bg-black/30 text-white/50 hover:text-white/80',
            )}
            title="Grid"
          >
            <Grid3X3 size={16} />
          </button>

          <button
            onClick={() => setTimer(timer === 0 ? 3 : timer === 3 ? 10 : 0)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-all',
              timer > 0
                ? 'bg-white/20 text-white'
                : 'bg-black/30 text-white/50 hover:text-white/80',
            )}
            title={`Timer: ${timer > 0 ? `${timer}s` : 'Off'}`}
          >
            <span className="relative">
              <Timer size={16} />
              {timer > 0 && (
                <span className="absolute -right-2 -top-2 text-[9px] font-bold">{timer}</span>
              )}
            </span>
          </button>

          <button
            onClick={handleCaptureClick}
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full transition-transform active:scale-95',
              mode === 'video' && recording ? 'bg-red-500' : 'bg-white',
            )}
          >
            <div
              className={cn(
                'rounded-full transition-all',
                mode === 'photo'
                  ? 'h-14 w-14 border-4 border-black/30'
                  : recording
                    ? 'h-8 w-8 rounded-md bg-white'
                    : 'h-14 w-14 border-4 border-black/30 bg-white',
              )}
            />
          </button>

          <button
            onClick={() => setMode(mode === 'photo' ? 'video' : 'photo')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white/50 backdrop-blur-md transition-all hover:text-white/80"
            title={`Switch to ${mode === 'photo' ? 'Video' : 'Photo'}`}
          >
            {mode === 'photo' ? <Video size={16} /> : <Camera size={16} />}
          </button>

          {devices.length > 1 && (
            <button
              onClick={switchCamera}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white/50 backdrop-blur-md transition-all hover:text-white/80"
              title="Switch Camera"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </div>

      {media.length > 0 && (
        <div className="border-border/20 flex h-24 shrink-0 items-center gap-2 overflow-x-auto border-t px-3">
          {media.map((item) => (
            <div
              key={item.id}
              className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg"
            >
              {item.type === 'photo' ? (
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="relative h-full w-full">
                  <img src={item.url} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Video size={16} className="text-white/70" />
                  </div>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => downloadMedia(item)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white/80 hover:bg-white/30"
                  title="Download"
                >
                  <Download size={11} />
                </button>
                <button
                  onClick={() => deleteMedia(item.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white/80 hover:bg-red-400/30"
                  title="Delete"
                >
                  <Trash2 size={11} />
                </button>
              </div>
              <div className="absolute bottom-0.5 right-1 text-[9px] text-white/50">
                {formatTimestamp(item.timestamp)}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="bg-background mx-4 max-w-sm rounded-xl p-4 text-center">
            <p className="text-foreground text-sm">{error}</p>
            <button onClick={() => setError('')} className="text-primary mt-2 text-xs">
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
