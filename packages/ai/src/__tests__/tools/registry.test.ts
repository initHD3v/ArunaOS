import { describe, it, expect, vi } from 'vitest';
import { ToolRegistry } from '../../tools/registry';
import type { AITool } from '../../types';

describe('ToolRegistry', () => {
  it('should register and retrieve tools', () => {
    const registry = new ToolRegistry();
    const tool: AITool = {
      id: 'test',
      name: 'test_tool',
      description: 'A test tool',
      category: 'system',
      parameters: [{ name: 'input', type: 'string', description: 'Input param', required: true }],
      execute: async () => ({ success: true, data: {} }),
    };

    registry.register(tool);
    expect(registry.get('test_tool')).toBe(tool);
    expect(registry.has('test_tool')).toBe(true);
    expect(registry.getAll()).toHaveLength(1);
  });

  it('should throw on duplicate registration', () => {
    const registry = new ToolRegistry();
    const tool: AITool = {
      id: 'test',
      name: 'dup',
      description: '',
      category: 'system',
      parameters: [],
      execute: async () => ({ success: true, data: {} }),
    };

    registry.register(tool);
    expect(() => registry.register(tool)).toThrow('already registered');
  });

  it('should get tools by category', () => {
    const registry = new ToolRegistry();
    const sysTool: AITool = {
      id: 's1',
      name: 'sys1',
      description: '',
      category: 'system',
      parameters: [],
      execute: async () => ({ success: true, data: {} }),
    };
    const modTool: AITool = {
      id: 'm1',
      name: 'mod1',
      description: '',
      category: 'module',
      parameters: [],
      execute: async () => ({ success: true, data: {} }),
    };

    registry.register(sysTool);
    registry.register(modTool);

    expect(registry.getByCategory('system')).toHaveLength(1);
    expect(registry.getByCategory('module')).toHaveLength(1);
    expect(registry.getByCategory('files')).toHaveLength(0);
  });

  it('should remove tools', () => {
    const registry = new ToolRegistry();
    const tool: AITool = {
      id: 't',
      name: 'tool',
      description: '',
      category: 'system',
      parameters: [],
      execute: async () => ({ success: true, data: {} }),
    };

    registry.register(tool);
    expect(registry.remove('tool')).toBe(true);
    expect(registry.has('tool')).toBe(false);
    expect(registry.remove('nonexistent')).toBe(false);
  });

  it('should execute a registered tool', async () => {
    const registry = new ToolRegistry();
    const mockExecute = vi.fn().mockResolvedValue({ success: true, data: { result: 42 } });
    const tool: AITool = {
      id: 't',
      name: 'calc',
      description: '',
      category: 'system',
      parameters: [],
      execute: mockExecute,
    };

    registry.register(tool);
    const result = await registry.execute('calc', { x: 1 });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ result: 42 });
    expect(mockExecute).toHaveBeenCalledWith({ x: 1 });
  });

  it('should return error for unknown tool execution', async () => {
    const registry = new ToolRegistry();
    const result = await registry.execute('unknown', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should clear all tools', () => {
    const registry = new ToolRegistry();
    const tool: AITool = {
      id: 't',
      name: 'tool',
      description: '',
      category: 'system',
      parameters: [],
      execute: async () => ({ success: true, data: {} }),
    };
    registry.register(tool);
    registry.clear();
    expect(registry.getAll()).toHaveLength(0);
  });
});
