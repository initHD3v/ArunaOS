'use client';

import { useRef, useEffect, useState, useCallback, memo, lazy, Suspense } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Copy, Check, Sparkles, AlertCircle, ChevronRight, Wrench, RotateCcw } from 'lucide-react';

// P2: react-markdown + remark-gfm + shiki are loaded on demand — only when
// the first assistant reply is actually rendered.
const MarkdownContent = lazy(() => import('./markdown-content'));

interface ChatMessage {
  role: 'user' | 'assistant' | 'tool' | 'error' | 'status';
  content: string;
  id: string;
  createdAt?: number;
  toolName?: string;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onRetry?: (message: string) => void;
}

/* ---------------------------------- Cards ---------------------------------- */

function ToolCard({ message }: { message: ChatMessage }) {
  const [open, setOpen] = useState(false);

  let label = 'Tool result';
  let success: boolean | null = null;
  let detail = '';
  try {
    const parsed = JSON.parse(message.content) as {
      success?: boolean;
      error?: string;
      toolName?: string;
      data?: unknown;
    };
    if (typeof parsed.success === 'boolean') {
      success = parsed.success;
      label = `${message.toolName ?? parsed.toolName ?? 'Tool'} ${success ? 'berhasil' : 'gagal'}`;
      detail = parsed.error ?? JSON.stringify(parsed.data ?? parsed, null, 2);
    } else {
      label = message.toolName ? `Hasil: ${message.toolName}` : 'Tool result';
      detail = JSON.stringify(parsed, null, 2);
    }
  } catch {
    label = message.toolName ? `Hasil: ${message.toolName}` : 'Tool result';
    detail = message.content;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex justify-start pl-10"
    >
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex max-w-[85%] items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition-colors',
          success === false
            ? 'border-danger/20 bg-danger/5 text-danger'
            : 'border-border/20 bg-muted/60 text-foreground/70 hover:bg-muted',
        )}
      >
        <Wrench className={cn('h-3 w-3 shrink-0', success !== false && 'text-primary')} />
        <span className="truncate font-medium">{label}</span>
        <ChevronRight
          className={cn(
            'text-foreground/50 h-3 w-3 shrink-0 transition-transform',
            open && 'rotate-90',
          )}
        />
      </button>
      {open && (
        <pre className="border-border/20 bg-muted/50 mt-1 max-h-48 max-w-[85%] overflow-auto whitespace-pre-wrap rounded-lg border p-2 font-mono text-[10px]">
          {detail}
        </pre>
      )}
    </motion.div>
  );
}

function ErrorCard({
  message,
  onRetry,
  lastUserMessage,
}: {
  message: ChatMessage;
  onRetry?: (message: string) => void;
  lastUserMessage?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex justify-start pl-10"
    >
      <div className="border-danger/20 bg-danger/5 max-w-[85%] rounded-xl border px-3.5 py-2.5">
        <div className="flex items-start gap-2">
          <AlertCircle className="text-danger mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p className="text-danger/90 line-clamp-4 break-all text-xs leading-relaxed">
            {message.content}
          </p>
        </div>
        {onRetry && lastUserMessage && (
          <button
            onClick={() => onRetry(lastUserMessage)}
            className="border-danger/30 text-danger hover:bg-danger/10 mt-2 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Coba lagi
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* --------------------------------- Messages --------------------------------- */

function formatTime(ts?: number): string | null {
  if (!ts) return null;
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
}

const MessageItem = memo(function MessageItem({
  message,
  onRetry,
  lastUserMessage,
}: {
  message: ChatMessage;
  onRetry?: (message: string) => void;
  lastUserMessage?: string;
}) {
  const [copied, setCopied] = useState(false);
  const time = formatTime(message.createdAt);

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(message.content)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }, [message.content]);

  if (message.role === 'status') {
    return (
      <div className="flex items-center gap-2 pl-10 pt-1">
        <span className="relative flex h-2 w-2">
          <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
          <span className="bg-primary relative inline-flex h-2 w-2 rounded-full" />
        </span>
        <span className="text-foreground/50 text-xs">{message.content}</span>
      </div>
    );
  }

  if (message.role === 'tool') return <ToolCard message={message} />;
  if (message.role === 'error')
    return <ErrorCard message={message} onRetry={onRetry} lastUserMessage={lastUserMessage} />;

  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="group flex justify-end"
      >
        <div className="relative max-w-[80%]">
          <div className="bg-primary/20 text-foreground whitespace-pre-wrap break-words rounded-2xl rounded-br-md px-4 py-2 text-sm leading-relaxed">
            {message.content}
          </div>
          <button
            onClick={handleCopy}
            className={cn(
              'absolute -left-7 top-1.5 rounded p-1 transition-opacity',
              copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            )}
            title="Copy message"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="text-foreground/50 hover:text-foreground/60 h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </motion.div>
    );
  }

  // Assistant
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="group flex justify-start gap-2.5"
    >
      <div className="from-primary/80 to-primary/40 shadow-primary/20 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br shadow-sm">
        <Sparkles className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-foreground/60 text-[11px] font-semibold">AI</span>
          {time && (
            <span className="text-foreground/40 text-[10px] opacity-0 transition-opacity group-hover:opacity-100">
              {time}
            </span>
          )}
        </div>
        <Suspense
          fallback={
            <span className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {message.content}
            </span>
          }
        >
          <MarkdownContent content={message.content} />
        </Suspense>
        <button
          onClick={handleCopy}
          className={cn(
            'text-foreground/50 hover:bg-muted hover:text-foreground/60 mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] transition-all',
            copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
          title="Copy message"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-500" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
});

/* -------------------------------- Container -------------------------------- */

export function ChatMessages({ messages, isLoading, onRetry }: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  useEffect(() => {
    if (nearBottomRef.current) {
      containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight });
    }
  }, [messages, isLoading]);

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content;

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-3xl">✨</div>
          <p className="text-foreground/50 text-sm">Ask me anything about ArunaOS</p>
          <p className="text-foreground/40 mt-1 text-xs">
            I can open apps, search files, generate modules, and more
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-6"
    >
      {messages.map((msg) => (
        <MessageItem
          key={msg.id}
          message={msg}
          onRetry={onRetry}
          lastUserMessage={lastUserMessage}
        />
      ))}
      {isLoading && (
        <div className="flex items-center gap-2.5 pl-10">
          <div className="flex items-center gap-1">
            <div className="bg-primary/60 h-1.5 w-1.5 animate-bounce rounded-full" />
            <div className="bg-primary/60 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:0.12s]" />
            <div className="bg-primary/60 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:0.24s]" />
          </div>
        </div>
      )}
    </div>
  );
}
