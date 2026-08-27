'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  Trash2,
  X,
  Image as ImageIcon,
  Video,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type CapturedMedia = {
  id: string;
  type: 'photo' | 'video';
  blob: Blob;
  url: string;
  timestamp: number;
};

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function Gallery({
  media,
  onDownload,
  onDelete,
  onClear,
}: {
  media: CapturedMedia[];
  onDownload: (m: CapturedMedia) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}) {
  const [lightbox, setLightbox] = useState<CapturedMedia | null>(null);
  const idx = lightbox ? media.findIndex((m) => m.id === lightbox.id) : -1;

  if (media.length === 0) {
    return (
      <div className="border-border/20 bg-muted/20 text-muted-foreground flex h-20 shrink-0 items-center justify-center gap-2 border-t px-4 text-xs">
        <ImageIcon size={14} />
        No captures yet — your photos & videos will appear here and persist after reload
      </div>
    );
  }

  return (
    <>
      <div className="border-border/20 bg-card flex h-[92px] shrink-0 flex-col gap-1 border-t px-2 py-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-foreground/70 text-[11px] font-semibold">
            Recent • {media.length}
          </span>
          <button
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground text-[11px]"
          >
            Clear all
          </button>
        </div>
        <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
          {media.map((m) => (
            <div
              key={m.id}
              onClick={() => setLightbox(m)}
              className="border-border/20 group relative h-14 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg border bg-black"
            >
              {m.type === 'photo' ? (
                <img src={m.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <video src={m.url} className="h-full w-full object-cover" muted />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(m);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-black"
                  >
                    <Download size={10} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(m.id);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
              <span className="absolute bottom-0.5 right-1 rounded bg-black/60 px-1 py-0.5 text-[8px] font-medium text-white">
                {fmtTime(m.timestamp)}
              </span>
              <span
                className={cn(
                  'absolute left-1 top-1 rounded-full p-1',
                  m.type === 'photo' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white',
                )}
              >
                {m.type === 'photo' ? <ImageIcon size={8} /> : <Video size={8} />}
              </span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col bg-black/90 backdrop-blur-xl"
            onClick={() => setLightbox(null)}
          >
            <div className="flex items-center justify-between p-3">
              <span className="text-xs font-medium text-white/80">
                {lightbox.type === 'photo' ? 'Photo' : 'Video'} • {fmtTime(lightbox.timestamp)}
              </span>
              <button
                onClick={() => setLightbox(null)}
                className="rounded-full bg-white/10 p-2 text-white"
              >
                <X size={14} />
              </button>
            </div>
            <div
              className="flex flex-1 items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => idx > 0 && setLightbox(media[idx - 1]!)}
                disabled={idx <= 0}
                className="mr-2 hidden h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-30 sm:flex"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex max-h-full max-w-full items-center justify-center overflow-hidden rounded-xl bg-black">
                {lightbox.type === 'photo' ? (
                  <img
                    src={lightbox.url}
                    alt=""
                    className="max-h-[60vh] max-w-full object-contain"
                  />
                ) : (
                  <video src={lightbox.url} controls autoPlay className="max-h-[60vh] max-w-full" />
                )}
              </div>
              <button
                onClick={() => idx < media.length - 1 && setLightbox(media[idx + 1]!)}
                disabled={idx >= media.length - 1}
                className="ml-2 hidden h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-30 sm:flex"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex justify-center gap-2 p-4">
              <button
                onClick={() => onDownload(lightbox)}
                className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black"
              >
                <Download size={12} /> Download
              </button>
              <button
                onClick={() => {
                  onDelete(lightbox.id);
                  setLightbox(null);
                }}
                className="flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-2 text-xs font-semibold text-white"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
