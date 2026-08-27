'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useCameraStream(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  mode: 'photo' | 'video',
) {
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [error, setError] = useState('');
  const [streamReady, setStreamReady] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreamReady(false);
  }, []);

  const start = useCallback(
    async (deviceId?: string) => {
      stop();
      setError('');
      setStreamReady(false);
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setError('Camera requires HTTPS and a supported browser.');
        setInitializing(false);
        return;
      }
      try {
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId } }
            : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: mode === 'video',
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStreamReady(true);
        const all = await navigator.mediaDevices.enumerateDevices();
        const cams = all.filter((d) => d.kind === 'videoinput');
        setDevices(cams);
      } catch (e: unknown) {
        const err = e as DOMException;
        if (err.name === 'NotAllowedError')
          setError('Camera access denied. Please allow camera in browser settings and reload.');
        else if (err.name === 'NotFoundError') setError('No camera found on this device.');
        else if (err.name === 'NotReadableError') setError('Camera is in use by another app.');
        else if (err.name === 'OverconstrainedError')
          setError('Camera does not support requested resolution.');
        else setError(`Could not access camera: ${err.message || 'Unknown error'}`);
      } finally {
        setInitializing(false);
      }
    },
    [mode, stop, videoRef],
  );

  useEffect(() => {
    const onEnded = () => setError('Camera disconnected.');
    const s = streamRef.current;
    s?.getVideoTracks().forEach((t) => t.addEventListener('ended', onEnded));
    return () => s?.getVideoTracks().forEach((t) => t.removeEventListener('ended', onEnded));
  }, [streamReady]);

  return { devices, error, setError, streamReady, initializing, streamRef, start, stop };
}
