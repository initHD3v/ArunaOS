import { describe, it, expect } from 'vitest';
import { ModuleAIApi } from './module-ai-api';

describe('ModuleAIApi', () => {
  it('registers and retrieves capability', () => {
    const api = new ModuleAIApi();
    api.registerCapability({
      moduleId: 'email',
      action: 'read',
      description: 'Read emails',
      execute: async () => ['email1'],
    });
    const cap = api.getCapability('email', 'read');
    expect(cap?.description).toBe('Read emails');
  });

  it('executes capability action', async () => {
    const api = new ModuleAIApi();
    api.registerCapability({
      moduleId: 'email',
      action: 'send',
      description: 'Send email',
      execute: async (params) => `sent to ${params.to}`,
    });
    const result = await api.executeAction('email', 'send', { to: 'test@example.com' });
    expect(result).toBe('sent to test@example.com');
  });

  it('throws on unknown capability', async () => {
    const api = new ModuleAIApi();
    await expect(api.executeAction('unknown', 'action')).rejects.toThrow('not found');
  });

  it('getAllCapabilities returns all', () => {
    const api = new ModuleAIApi();
    api.registerCapability({
      moduleId: 'a',
      action: 'x',
      description: '',
      execute: async () => {},
    });
    api.registerCapability({
      moduleId: 'b',
      action: 'y',
      description: '',
      execute: async () => {},
    });
    expect(api.getAllCapabilities()).toHaveLength(2);
  });

  it('unregisters capability', () => {
    const api = new ModuleAIApi();
    api.registerCapability({
      moduleId: 'a',
      action: 'x',
      description: '',
      execute: async () => {},
    });
    api.unregisterCapability('a', 'x');
    expect(api.getCapability('a', 'x')).toBeUndefined();
  });

  it('unregisters all for a module', () => {
    const api = new ModuleAIApi();
    api.registerCapability({
      moduleId: 'a',
      action: 'x',
      description: '',
      execute: async () => {},
    });
    api.registerCapability({
      moduleId: 'a',
      action: 'y',
      description: '',
      execute: async () => {},
    });
    api.unregisterAll('a');
    expect(api.getAllCapabilities()).toHaveLength(0);
  });
});
