import { describe, it, expect, vi } from 'vitest';
import { ServiceContainer } from '../container';

describe('ServiceContainer', () => {
  it('should register and get a service', () => {
    const container = new ServiceContainer();
    container.register('logger', () => ({ log: vi.fn() }));
    const logger = container.get<{ log: ReturnType<typeof vi.fn> }>('logger');
    expect(logger.log).toBeDefined();
  });

  it('should return same instance (singleton)', () => {
    const container = new ServiceContainer();
    const factory = vi.fn(() => ({ value: 42 }));
    container.register('test', factory);
    const a = container.get('test');
    const b = container.get('test');
    expect(a).toBe(b);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('should throw when getting unregistered service', () => {
    const container = new ServiceContainer();
    expect(() => container.get('nonexistent')).toThrow('is not registered');
  });

  it('should throw on duplicate registration', () => {
    const container = new ServiceContainer();
    container.register('test', () => ({}));
    expect(() => container.register('test', () => ({}))).toThrow('already registered');
  });

  it('should check if service exists', () => {
    const container = new ServiceContainer();
    container.register('exists', () => ({}));
    expect(container.has('exists')).toBe(true);
    expect(container.has('missing')).toBe(false);
  });

  it('should detect circular dependencies', () => {
    const container = new ServiceContainer();
    container.register('a', () => ({}), ['b']);
    container.register('b', () => ({}), ['a']);
    expect(() => container.bootstrap()).toThrow('Circular dependency');
  });

  it('should detect self-circular dependency', () => {
    const container = new ServiceContainer();
    container.register('a', () => ({}), ['a']);
    expect(() => container.bootstrap()).toThrow('Circular dependency');
  });

  it('should initialize dependencies in order', () => {
    const order: string[] = [];
    const container = new ServiceContainer();

    container.register('dep', () => {
      order.push('dep');
      return { value: 1 };
    });

    container.register(
      'main',
      () => {
        order.push('main');
        return { value: 2 };
      },
      ['dep'],
    );

    container.bootstrap();
    expect(order).toEqual(['dep', 'main']);
  });

  it('should not bootstrap twice', () => {
    const container = new ServiceContainer();
    const factory = vi.fn(() => ({}));
    container.register('test', factory);
    container.bootstrap();
    container.bootstrap();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('should handle services with no dependencies', () => {
    const container = new ServiceContainer();
    container.register('a', () => ({}));
    container.register('b', () => ({}));
    expect(() => container.bootstrap()).not.toThrow();
    expect(container.isInitialized('a')).toBe(true);
    expect(container.isInitialized('b')).toBe(true);
  });

  it('should return registered service names', () => {
    const container = new ServiceContainer();
    container.register('a', () => ({}));
    container.register('b', () => ({}));
    const names = container.getServiceNames();
    expect(names).toContain('a');
    expect(names).toContain('b');
  });

  it('should return dependency graph', () => {
    const container = new ServiceContainer();
    container.register('a', () => ({}), ['b', 'c']);
    container.register('b', () => ({}));
    container.register('c', () => ({}));
    const graph = container.getDependencyGraph();
    expect(graph).toEqual({ a: ['b', 'c'], b: [], c: [] });
  });

  it('should detect diamond dependencies', () => {
    const container = new ServiceContainer();
    container.register('shared', () => ({}));
    container.register('left', () => ({}), ['shared']);
    container.register('right', () => ({}), ['shared']);
    container.register('root', () => ({}), ['left', 'right']);

    expect(() => container.bootstrap()).not.toThrow();
    expect(container.isInitialized('shared')).toBe(true);
    expect(container.isInitialized('left')).toBe(true);
    expect(container.isInitialized('right')).toBe(true);
    expect(container.isInitialized('root')).toBe(true);
  });

  it('should throw if a dependency is not registered', () => {
    const container = new ServiceContainer();
    container.register('a', () => ({}), ['missing']);
    expect(() => container.bootstrap()).toThrow('is not registered');
  });
});
