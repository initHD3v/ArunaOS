import type {
  AIProvider,
  AIProviderConfig,
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
} from '../types';

const DEFAULT_MODEL = 'onnx-community/Qwen2.5-0.5B-Instruct';
const LOW_MEM_MODEL = 'onnx-community/SmolLM2-360M-Instruct-ONNX';

function selectModel(): string {
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (mem !== undefined && mem < 4) return LOW_MEM_MODEL;
  return DEFAULT_MODEL;
}

type Pipeline = (
  text: string,
  options?: Record<string, unknown>,
) => Promise<Array<{ generated_text: string }>>;

let sharedPipeline: { fn: Pipeline; modelId: string } | null = null;
let sharedLoading = false;

function dispatchProgress(p: {
  status: string;
  loaded: number;
  total: number;
  modelId?: string;
  error?: string;
}) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aruna-model-progress', { detail: p }));
  }
}

async function getPipeline(modelId: string): Promise<Pipeline> {
  if (sharedPipeline?.modelId === modelId) {
    dispatchProgress({ status: 'ready', loaded: 0, total: 0, modelId });
    return sharedPipeline.fn;
  }

  if (sharedLoading) {
    dispatchProgress({ status: 'waiting', loaded: 0, total: 0, modelId });
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (sharedPipeline && !sharedLoading) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
    dispatchProgress({ status: 'ready', loaded: 0, total: 0, modelId });
    return sharedPipeline!.fn;
  }

  sharedLoading = true;
  dispatchProgress({ status: 'downloading', loaded: 0, total: 0, modelId });

  try {
    const { env, pipeline } = await import('@xenova/transformers');

    env.allowLocalModels = false;

    const pipe = (await pipeline('text-generation', modelId, {
      quantized: true,
      progress_callback: (progress: { status: string; loaded: number; total: number }) => {
        dispatchProgress({ ...progress, modelId });
      },
    })) as Pipeline;

    sharedPipeline = { fn: pipe, modelId };
    sharedLoading = false;
    dispatchProgress({ status: 'ready', loaded: 0, total: 0, modelId });

    return pipe;
  } catch (err) {
    sharedLoading = false;
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    dispatchProgress({ status: 'error', loaded: 0, total: 0, modelId, error: errMsg });
    throw err;
  }
}

function formatMessages(
  messages: Array<{ role: string; content: string }>,
  systemPrompt?: string,
): string {
  const parts: string[] = [];
  if (systemPrompt) {
    parts.push(`<|im_start|>system\n${systemPrompt}<|im_end|>`);
  }
  for (const msg of messages) {
    parts.push(`<|im_start|>${msg.role}\n${msg.content}<|im_end|>`);
  }
  parts.push('<|im_start|>assistant\n');
  return parts.join('\n');
}

export class NativeModelProvider implements AIProvider {
  readonly type = 'native' as const;
  readonly model: string;
  private maxTokens: number;
  private temperature: number;
  private pipe: Pipeline | null = null;

  constructor(config: AIProviderConfig = {}) {
    this.model = config.model ?? selectModel();
    this.maxTokens = config.maxTokens ?? 256;
    this.temperature = config.temperature ?? 0.7;
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined';
  }

  async load(): Promise<void> {
    this.pipe = await getPipeline(this.model);
  }

  async complete(req: AICompletionRequest): Promise<AICompletionResponse> {
    if (!this.pipe) await this.load();

    const prompt = formatMessages(req.messages, req.systemPrompt);

    const result = await this.pipe!(prompt, {
      max_new_tokens: req.maxTokens ?? this.maxTokens,
      temperature: req.temperature ?? this.temperature,
      do_sample: true,
      repetition_penalty: 1.1,
    });

    const full = result[0]?.generated_text ?? '';
    const afterPrompt = full.slice(prompt.length).trim();

    return {
      message: { role: 'assistant', content: afterPrompt },
    };
  }

  async *completeStream(req: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    if (!this.pipe) await this.load();

    const prompt = formatMessages(req.messages, req.systemPrompt);

    const result = await this.pipe!(prompt, {
      max_new_tokens: req.maxTokens ?? this.maxTokens,
      temperature: req.temperature ?? this.temperature,
      do_sample: true,
      repetition_penalty: 1.1,
    });

    const full = result[0]?.generated_text ?? '';
    const afterPrompt = full.slice(prompt.length).trim();

    for (const char of afterPrompt) {
      yield { type: 'text', content: char };
      await new Promise((r) => setTimeout(r, 5));
    }

    yield { type: 'done', content: '', done: true };
  }
}
