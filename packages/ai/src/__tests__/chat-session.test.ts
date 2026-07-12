import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatSession } from '../chat-session';
import { AIService } from '../ai-service';

function createMockAI(): AIService {
  const ai = new AIService();
  ai.registerProvider('openai', { apiKey: 'sk-test' });
  return ai;
}

function createMockFetch(content: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [{ message: { content } }],
    }),
  });
}

describe('ChatSession', () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = createMockAI();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('should create session with config', () => {
      const session = new ChatSession(
        { id: 'test-session', systemPrompt: 'Be helpful' },
        aiService,
      );
      expect(session.id).toBe('test-session');
      expect(session.getState().messages).toHaveLength(0);
    });

    it('should default to empty messages', () => {
      const session = new ChatSession({ id: 's1' }, aiService);
      expect(session.getMessages()).toEqual([]);
    });
  });

  describe('addMessage', () => {
    it('should add messages to history', () => {
      const session = new ChatSession({ id: 's1' }, aiService);
      session.addMessage('user', 'Hello');
      session.addMessage('assistant', 'Hi there');

      expect(session.getMessages()).toHaveLength(2);
      expect(session.getMessages()[0]!.role).toBe('user');
      expect(session.getMessages()[0]!.content).toBe('Hello');
      expect(session.getMessages()[1]!.role).toBe('assistant');
    });

    it('should add timestamps to messages', () => {
      const session = new ChatSession({ id: 's1' }, aiService);
      session.addMessage('user', 'Test');

      expect(session.getMessages()[0]!.timestamp).toBeDefined();
      expect(typeof session.getMessages()[0]!.timestamp).toBe('number');
    });

    it('should support toolName and toolCallId', () => {
      const session = new ChatSession({ id: 's1' }, aiService);
      session.addMessage('tool', '{"result":"ok"}', 'search', 'call-1');

      const msg = session.getMessages()[0];
      expect(msg!.role).toBe('tool');
      expect(msg!.toolName).toBe('search');
      expect(msg!.toolCallId).toBe('call-1');
    });

    it('should enforce max history', () => {
      const session = new ChatSession({ id: 's1', maxHistory: 3 }, aiService);
      for (let i = 0; i < 10; i++) {
        session.addMessage('user', `msg-${i}`);
      }
      expect(session.getMessages().length).toBeLessThanOrEqual(3);
    });
  });

  describe('clear', () => {
    it('should clear all messages', () => {
      const session = new ChatSession({ id: 's1' }, aiService);
      session.addMessage('user', 'Hello');
      session.clear();
      expect(session.getMessages()).toHaveLength(0);
    });
  });

  describe('sendMessage', () => {
    it('should send message and return assistant response', async () => {
      vi.stubGlobal('fetch', createMockFetch('Hello back!'));

      const session = new ChatSession({ id: 's1' }, aiService);
      const response = await session.sendMessage('Hi');

      expect(response.role).toBe('assistant');
      expect(response.content).toBe('Hello back!');
      expect(session.getMessages()).toHaveLength(2);
      expect(session.getMessages()[0]!.role).toBe('user');
      expect(session.getMessages()[1]!.role).toBe('assistant');
    });
  });

  describe('sendMessageStream', () => {
    it('should yield text chunks', async () => {
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello "}}]}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"world!"}}]}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [DONE]\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          body: { getReader: () => mockReader },
        }),
      );

      const session = new ChatSession({ id: 's1' }, aiService);

      const chunks: string[] = [];
      for await (const chunk of session.sendMessageStream('Hi')) {
        if (chunk.type === 'text') chunks.push(chunk.content);
      }

      expect(chunks).toEqual(['Hello ', 'world!']);
      expect(session.getMessages()).toHaveLength(2);
    });

    it('should track streaming state', async () => {
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [DONE]\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          body: { getReader: () => mockReader },
        }),
      );

      const session = new ChatSession({ id: 's1' }, aiService);
      expect(session.isStreaming()).toBe(false);

      for await (const _chunk of session.sendMessageStream('Hi')) {
        // consume
      }

      expect(session.isStreaming()).toBe(false);
    });
  });

  describe('getState', () => {
    it('should return session state snapshot', () => {
      const session = new ChatSession({ id: 's1', provider: 'openai' }, aiService);
      session.addMessage('user', 'Hello');

      const state = session.getState();
      expect(state.id).toBe('s1');
      expect(state.messages).toHaveLength(1);
      expect(state.createdAt).toBeGreaterThan(0);
      expect(state.updatedAt).toBeGreaterThan(0);
    });
  });

  describe('setProvider', () => {
    it('should change provider', () => {
      const ai = new AIService();
      ai.registerProvider('openai', { apiKey: 'sk-test' });
      ai.registerProvider('ollama', { baseUrl: 'http://localhost:11434' });

      const session = new ChatSession({ id: 's1' }, ai);
      expect(session.getProvider()).toBe('openai');

      session.setProvider('ollama');
      expect(session.getProvider()).toBe('ollama');
    });
  });
});
