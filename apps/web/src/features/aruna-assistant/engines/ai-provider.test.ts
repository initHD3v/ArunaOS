import { describe, it, expect, beforeEach } from 'vitest';
import { AIProviderRegistryImpl } from './ai-provider';
import type { AIProvider } from './types';

describe('AIProviderRegistry', () => {
  let registry: AIProviderRegistryImpl;

  beforeEach(() => {
    registry = new AIProviderRegistryImpl();
  });

  it('starts with no available providers', () => {
    expect(registry.getAvailable()).toEqual([]);
    expect(registry.getDefault()).toBeNull();
  });

  it('registers a provider', () => {
    const provider: AIProvider = {
      name: 'test',
      type: 'local',
      chat: async () => 'response',
      isAvailable: () => true,
    };
    registry.register(provider);
    expect(registry.get('test')).toBe(provider);
  });

  it('returns first registered provider as default', () => {
    const p1: AIProvider = {
      name: 'p1',
      type: 'local',
      chat: async () => '',
      isAvailable: () => true,
    };
    const p2: AIProvider = {
      name: 'p2',
      type: 'cloud',
      chat: async () => '',
      isAvailable: () => true,
    };
    registry.register(p1);
    registry.register(p2);
    expect(registry.getDefault()?.name).toBe('p1');
  });

  it('filters available providers', () => {
    const p1: AIProvider = {
      name: 'p1',
      type: 'local',
      chat: async () => '',
      isAvailable: () => true,
    };
    const p2: AIProvider = {
      name: 'p2',
      type: 'cloud',
      chat: async () => '',
      isAvailable: () => false,
    };
    registry.register(p1);
    registry.register(p2);
    const available = registry.getAvailable();
    expect(available).toHaveLength(1);
    expect(available[0]!.name).toBe('p1');
  });

  it('returns null for unknown provider', () => {
    expect(registry.get('nonexistent')).toBeNull();
  });
});
