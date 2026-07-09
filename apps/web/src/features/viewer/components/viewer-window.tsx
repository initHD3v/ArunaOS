'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { FileQuestion, Music } from 'lucide-react';
import { getFileCategory, canOpenNative } from '../utils/file-types';
import type { WindowData } from '@/types';

interface ViewerWindowProps {
  data: WindowData;
}

const ImageViewer = memo(function ImageViewer({ url, name }: { url: string; name: string }) {
  return (
    <div className="flex h-full items-center justify-center bg-black/20 p-4">
      <img
        src={url}
        alt={name}
        className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
      />
    </div>
  );
});

const AudioPlayer = memo(function AudioPlayer({ url, name }: { url: string; name: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10">
        <Music size={40} className="text-foreground/60" />
      </div>
      <p className="text-foreground/70 max-w-full truncate text-sm font-medium">{name}</p>
      <audio src={url} controls className="w-full max-w-md" />
    </div>
  );
});

const TextViewer = memo(function TextViewer({ url }: { url: string }) {
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => r.text())
      .then((t) => {
        if (!cancelled) {
          setText(t);
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="text-foreground/30 flex h-full items-center justify-center text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <pre className="text-foreground/70 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
        {text}
      </pre>
    </div>
  );
});

const NotSupported = memo(function NotSupported({ name }: { name: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
      <FileQuestion size={48} className="text-foreground/20" />
      <p className="text-foreground/50 text-center text-sm">
        Cannot preview <span className="text-foreground/70 font-medium">{name}</span>
      </p>
      <p className="text-foreground/30 text-xs">This file type is not supported yet.</p>
    </div>
  );
});

export const ViewerWindow = memo(function ViewerWindow({ data }: ViewerWindowProps) {
  const appData = data.appData as { url?: string; filename?: string; type?: string } | undefined;

  const url = appData?.url;
  const filename = appData?.filename ?? 'file';
  const category = useMemo(() => getFileCategory(filename), [filename]);

  if (!url) {
    return <NotSupported name={filename} />;
  }

  if (!canOpenNative(filename)) {
    return <NotSupported name={filename} />;
  }

  switch (category) {
    case 'image':
      return <ImageViewer url={url} name={filename} />;
    case 'audio':
      return <AudioPlayer url={url} name={filename} />;
    case 'text':
    case 'code':
    case 'markdown':
      return <TextViewer url={url} />;
    default:
      return <NotSupported name={filename} />;
  }
});
