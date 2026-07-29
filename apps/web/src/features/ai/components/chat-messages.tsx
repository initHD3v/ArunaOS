'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant' | 'tool' | 'error' | 'status';
  content: string;
  id: string;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

function formatContent(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (parsed.success !== undefined) {
      return `⚡ Tool Result: ${parsed.success ? 'Success' : 'Failed'}${parsed.error ? ` — ${parsed.error}` : ''}`;
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return content;
  }
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';
  const isError = message.role === 'error';
  const isStatus = message.id.startsWith('status-');
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(message.content)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }, [message.content]);

  const baseClasses = cn(
    'max-w-[80%] rounded-lg px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words',
  );

  if (isStatus) {
    return (
      <div className="flex justify-center">
        <div className="bg-muted text-foreground/60 flex items-center gap-2 rounded-full px-4 py-1.5 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
            <span className="bg-primary relative inline-flex h-2 w-2 rounded-full" />
          </span>
          {message.content === 'Searching web...' ? (
            <span>Searching web...</span>
          ) : (
            <span className="flex items-center gap-1.5">
              Thinking
              <span className="flex gap-0.5">
                <span className="bg-foreground/40 h-1 w-1 animate-bounce rounded-full [animation-delay:0s]" />
                <span className="bg-foreground/40 h-1 w-1 animate-bounce rounded-full [animation-delay:0.15s]" />
                <span className="bg-foreground/40 h-1 w-1 animate-bounce rounded-full [animation-delay:0.3s]" />
              </span>
            </span>
          )}
        </div>
      </div>
    );
  }

  if (isTool) {
    return (
      <div className="flex justify-center">
        <div className="bg-primary/10 text-primary rounded-md px-3 py-1.5 text-xs">
          {formatContent(message.content)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-start">
        <div className={cn(baseClasses, 'bg-danger/10 text-danger')}>{message.content}</div>
      </div>
    );
  }

  return (
    <div className={`group flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="relative max-w-[80%]">
        <div
          className={cn(
            baseClasses,
            'pr-8',
            isUser ? 'bg-primary/20 text-primary-foreground' : 'bg-muted text-foreground',
          )}
        >
          {message.content}
        </div>
        <button
          onClick={handleCopy}
          className="text-foreground/30 hover:text-foreground/60 absolute right-1.5 top-2 opacity-0 transition-opacity group-hover:opacity-100"
          title="Copy message"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-muted flex items-center gap-1.5 rounded-lg px-4 py-2">
            <div className="bg-primary h-1.5 w-1.5 animate-bounce rounded-full" />
            <div className="bg-primary h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:0.1s]" />
            <div className="bg-primary h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:0.2s]" />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
