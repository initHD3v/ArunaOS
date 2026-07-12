export interface ModuleCapability {
  moduleId: string;
  action: string;
  description: string;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

export class ModuleAIApi {
  private capabilities: Map<string, ModuleCapability> = new Map();

  registerCapability(capability: ModuleCapability): void {
    const key = `${capability.moduleId}:${capability.action}`;
    this.capabilities.set(key, capability);
  }

  unregisterCapability(moduleId: string, action: string): void {
    const key = `${moduleId}:${action}`;
    this.capabilities.delete(key);
  }

  unregisterAll(moduleId: string): void {
    for (const [key, cap] of this.capabilities) {
      if (cap.moduleId === moduleId) {
        this.capabilities.delete(key);
      }
    }
  }

  getCapability(moduleId: string, action: string): ModuleCapability | undefined {
    return this.capabilities.get(`${moduleId}:${action}`);
  }

  async executeAction(
    moduleId: string,
    action: string,
    params: Record<string, unknown> = {},
  ): Promise<unknown> {
    const cap = this.getCapability(moduleId, action);
    if (!cap) {
      throw new Error(`Capability ${moduleId}:${action} not found`);
    }
    return cap.execute(params);
  }

  getAllCapabilities(): ModuleCapability[] {
    return Array.from(this.capabilities.values());
  }

  getCapabilitiesForModule(moduleId: string): ModuleCapability[] {
    return Array.from(this.capabilities.values()).filter((c) => c.moduleId === moduleId);
  }
}
