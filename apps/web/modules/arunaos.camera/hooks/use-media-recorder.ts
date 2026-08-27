'use client';

import { useCallback, useRef, useState } from 'react';

export function useMediaRecorder(streamRef: React.RefObject<MediaStream | null>) {
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<number | null>(null);

  const start = useCallback(
    (onStop: (blob: Blob) => void) => {
      const stream = streamRef.current;
      if (!stream) return;
      const types = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'];
      const mime = types.find((t) => {
        try {
          return MediaRecorder.isTypeSupported(t);
        } catch {
          return false;
        }
      });
      if (!mime) {
        throw new Error('Video recording not supported');
      }
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || 'video/webm' });
        onStop(blob);
        setRecording(false);
        setRecordingTime(0);
        if (timerRef.current) window.clearInterval(timerRef.current);
      };
      rec.start(100);
      recRef.current = rec;
      setRecording(true);
      timerRef.current = window.setInterval(() => setRecordingTime((p) => p + 1), 1000);
    },
    [streamRef],
  );

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const cancel = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    recRef.current = null;
    setRecording(false);
    setRecordingTime(0);
  }, []);

  return { recording, recordingTime, start, stop, cancel, recRef };
}
