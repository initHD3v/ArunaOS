'use client';

import { useState, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }, [code]);

  // Shiki lives behind a dynamic import so it never enters the initial bundle.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { codeToHtml } = await import('shiki');
        const out = await codeToHtml(code, {
          lang,
          themes: { light: 'vitesse-light', dark: 'vitesse-dark' },
          defaultColor: false,
        });
        if (!cancelled) setHtml(out);
      } catch {
        /* unknown lang or load failure — keep plain rendering */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  return (
    <div className="group/code border-border/20 bg-muted/50 relative my-2 overflow-hidden rounded-lg border text-xs">
      <div className="border-border/20 flex items-center justify-between border-b px-3 py-1">
        <span className="text-foreground/40 font-mono text-[10px] uppercase">{lang}</span>
        <button
          onClick={handleCopy}
          className="text-foreground/30 hover:text-foreground/60 flex items-center gap-1 rounded px-1 py-0.5 text-[10px] transition-colors"
        >
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {html ? (
        <div
          className="[&_.shiki]:bg-transparent! [&_pre]:overflow-x-auto [&_pre]:p-3 [&_pre]:font-mono [&_pre]:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-x-auto p-3 font-mono leading-relaxed">{code}</pre>
      )}
    </div>
  );
}

export default function MarkdownContent({ content }: { content: string }) {
  const components = {
    code(props: { className?: string; children?: React.ReactNode }) {
      const { className, children } = props;
      const match = /language-(\w+)/.exec(className ?? '');
      const text = String(children ?? '').replace(/\n$/, '');
      if (!match && !text.includes('\n')) {
        return (
          <code className="bg-muted rounded px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
        );
      }
      return <CodeBlock code={text} lang={match?.[1] ?? 'text'} />;
    },
    pre(props: { children?: React.ReactNode }) {
      return <>{props.children}</>;
    },
    a(props: { href?: string; children?: React.ReactNode }) {
      return (
        <a
          href={props.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:opacity-80"
        >
          {props.children}
        </a>
      );
    },
    table(props: { children?: React.ReactNode }) {
      return (
        <div className="border-border/20 my-2 overflow-x-auto rounded-lg border">
          <table className="text-xs">{props.children}</table>
        </div>
      );
    },
    th(props: { children?: React.ReactNode }) {
      return (
        <th className="border-border/10 bg-muted/50 border-b px-2.5 py-1.5 text-left">
          {props.children}
        </th>
      );
    },
    td(props: { children?: React.ReactNode }) {
      return <td className="border-border/10 border-b px-2.5 py-1.5">{props.children}</td>;
    },
  };

  return (
    <>
      {/* Shiki dual-theme switcher */}
      <style>{`
        .shiki, .shiki span { color: var(--shiki-light); background-color: transparent; }
        html.dark .shiki, html.dark .shiki span { color: var(--shiki-dark); }
      `}</style>
      <div className="[&_blockquote]:border-primary/40 break-words text-sm leading-relaxed [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_h1]:mb-1 [&_h1]:mt-3 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-1 [&_h2]:mt-2 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-medium [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_p]:first:mt-0 [&_p]:last:mb-0 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      </div>
    </>
  );
}
