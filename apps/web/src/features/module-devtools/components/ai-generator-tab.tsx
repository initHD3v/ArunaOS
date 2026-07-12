'use client';

import { useState, type FormEvent } from 'react';
import { Sparkles, Download, Code, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GeneratedModule {
  id: string;
  code: string;
  manifest: Record<string, unknown>;
  files: Array<{ path: string; content: string }>;
  generatedByAI: boolean;
}

export function AIGeneratorTab() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capabilities, setCapabilities] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedModule | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const capList = capabilities
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const providerConfig = (() => {
        try {
          const raw = localStorage.getItem('ai-provider-configs');
          if (!raw) return undefined;
          const configs = JSON.parse(raw) as Array<{
            type: string;
            apiKey?: string;
            baseUrl?: string;
            model?: string;
          }>;
          const match = configs.find((c) => c.apiKey);
          if (!match) return undefined;
          return {
            type: match.type,
            apiKey: match.apiKey,
            baseUrl: match.baseUrl ?? '',
            model: match.model ?? '',
          };
        } catch {
          return undefined;
        }
      })();

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          capabilities: capList,
          ...(providerConfig ? { providerConfig } : {}),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadModule = () => {
    if (!result) return;
    const blob = new Blob(
      [
        JSON.stringify(
          { id: result.id, manifest: result.manifest, code: result.code, files: result.files },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyCode = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <div className="mb-4">
        <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <Sparkles size={14} className="text-primary" />
          AI Module Generator
        </h3>
        <p className="text-foreground/40 mt-1 text-xs">
          Describe your module and AI will generate the code, manifest, and file structure
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-foreground/50 mb-1 block text-[10px] font-medium">
            Module Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., My Awesome Module"
            className={cn(
              'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
              'border-border/20 bg-muted text-foreground',
              'focus:border-primary/50',
            )}
          />
        </div>

        <div>
          <label className="text-foreground/50 mb-1 block text-[10px] font-medium">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does your module do?"
            rows={3}
            className={cn(
              'w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
              'border-border/20 bg-muted text-foreground',
              'focus:border-primary/50',
            )}
          />
        </div>

        <div>
          <label className="text-foreground/50 mb-1 block text-[10px] font-medium">
            Capabilities <span className="text-foreground/30">(comma-separated)</span>
          </label>
          <input
            value={capabilities}
            onChange={(e) => setCapabilities(e.target.value)}
            placeholder="e.g., file-management, image-editing, data-visualization"
            className={cn(
              'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
              'border-border/20 bg-muted text-foreground',
              'focus:border-primary/50',
            )}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim() || !description.trim()}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'disabled:opacity-40',
          )}
        >
          {loading ? (
            <>
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Generate Module
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="bg-danger/10 text-danger mt-3 rounded-lg px-3 py-2 text-xs">{error}</div>
      )}

      {result && (
        <div className="mt-4 space-y-3">
          <div className="bg-success/10 flex items-center gap-2 rounded-lg px-3 py-2">
            <Check size={14} className="text-success" />
            <span className="text-success text-xs">
              Generated {result.id}
              {result.generatedByAI ? ' with AI' : ' (keyword fallback)'}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={downloadModule}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors',
                'bg-muted text-foreground/70 hover:bg-muted/80',
              )}
            >
              <Download size={12} />
              Download
            </button>
            <button
              onClick={copyCode}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors',
                'bg-muted text-foreground/70 hover:bg-muted/80',
              )}
            >
              <Code size={12} />
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>

          <div className="border-border/20 bg-muted/50 rounded-lg border">
            <div className="border-border/20 text-foreground/40 border-b px-3 py-2 text-[10px] font-medium">
              Generated Files ({result.files.length})
            </div>
            <div className="space-y-1 p-2">
              {result.files.map((f) => (
                <div key={f.path} className="flex items-center gap-2 rounded px-2 py-1 text-xs">
                  <Code size={10} className="text-primary shrink-0" />
                  <span className="text-foreground/60">{f.path}</span>
                  <span className="text-foreground/30 ml-auto text-[10px]">
                    {f.content.length} bytes
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
