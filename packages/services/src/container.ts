type ServiceFactory<T> = () => T;

interface ServiceDefinition<T> {
  name: string;
  factory: ServiceFactory<T>;
  deps: string[];
  instance: T | null;
  initialized: boolean;
}

export class ServiceContainer {
  private services = new Map<string, ServiceDefinition<unknown>>();
  private bootstrapped = false;

  register<T>(name: string, factory: ServiceFactory<T>, deps: string[] = []): void {
    if (this.services.has(name)) {
      throw new Error(`Service "${name}" is already registered`);
    }
    this.services.set(name, { name, factory, deps, instance: null, initialized: false });
  }

  get<T>(name: string): T {
    const def = this.services.get(name);
    if (!def) {
      throw new Error(`Service "${name}" is not registered`);
    }
    if (!def.initialized) {
      def.instance = def.factory();
      def.initialized = true;
    }
    return def.instance as T;
  }

  has(name: string): boolean {
    return this.services.has(name);
  }

  isInitialized(name: string): boolean {
    return this.services.get(name)?.initialized ?? false;
  }

  bootstrap(): void {
    if (this.bootstrapped) {
      return;
    }

    const visited = new Set<string>();
    const visiting = new Set<string>();

    const init = (name: string, path: string[]): void => {
      if (visiting.has(name)) {
        const cycle = [...path, name].join(' → ');
        throw new Error(`Circular dependency detected: ${cycle}`);
      }
      if (visited.has(name)) {
        return;
      }

      const def = this.services.get(name);
      if (!def) {
        throw new Error(`Service "${name}" is not registered`);
      }

      visiting.add(name);
      path.push(name);

      for (const dep of def.deps) {
        init(dep, [...path]);
      }

      if (!def.initialized) {
        def.instance = def.factory();
        def.initialized = true;
      }

      visiting.delete(name);
      visited.add(name);
    };

    for (const name of this.services.keys()) {
      init(name, []);
    }

    this.bootstrapped = true;
  }

  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    for (const [name, def] of this.services) {
      graph[name] = [...def.deps];
    }
    return graph;
  }
}
