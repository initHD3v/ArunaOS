import type { AITool, AIToolResult } from '../types';

export class ToolRegistry {
  private tools: Map<string, AITool> = new Map();

  register(tool: AITool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): AITool | undefined {
    return this.tools.get(name);
  }

  getAll(): AITool[] {
    return Array.from(this.tools.values());
  }

  getByCategory(category: string): AITool[] {
    return this.getAll().filter((t) => t.category === category);
  }

  remove(name: string): boolean {
    return this.tools.delete(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  async execute(name: string, params: Record<string, unknown>): Promise<AIToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Tool "${name}" not found` };
    }
    return tool.execute(params);
  }

  clear(): void {
    this.tools.clear();
  }
}
