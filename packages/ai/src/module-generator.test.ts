import { describe, it, expect } from 'vitest';
import { ModuleGenerator } from './module-generator';

describe('ModuleGenerator', () => {
  const generator = new ModuleGenerator();

  it('generates a module with valid structure', () => {
    const result = generator.generate({
      name: 'MyApp',
      description: 'A sample application module',
    });

    expect(result.id).toBe('myapp');
    expect(result.code).toContain('mount');
    expect(result.code).toContain('unmount');
    expect(result.code).toContain('execute');
    expect(result.manifest).toBeDefined();
    expect(result.files).toHaveLength(4);
    expect(result.files[0]!.path).toBe('module.json');
    expect(result.files[1]!.path).toBe('src/index.ts');
    expect(result.files[2]!.path).toBe('.gitignore');
    expect(result.files[3]!.path).toBe('README.md');
  });

  it('infers permissions from description', () => {
    const result = generator.generate({
      name: 'CameraApp',
      description: 'Take photos and record video using the camera',
    });

    const manifest = result.manifest as { permissions: string[] };
    expect(manifest.permissions).toContain('camera');
  });

  it('infers network permission for api-related descriptions', () => {
    const result = generator.generate({
      name: 'HttpClient',
      description: 'Make API calls and fetch data from remote endpoints',
    });

    const manifest = result.manifest as { permissions: string[] };
    expect(manifest.permissions).toContain('network');
  });

  it('generates files array with correct structure', () => {
    const result = generator.generate({
      name: 'TestModule',
      description: 'A test module',
      capabilities: ['storage', 'notify'],
    });

    expect(result.files.every((f) => f.path && typeof f.content === 'string')).toBe(true);
    expect(result.files[0]!.content).toContain('"name": "TestModule"');
  });

  it('sanitizes invalid IDs', () => {
    const result = generator.generate({
      name: '123Invalid Name!',
      description: 'Testing sanitization',
    });

    expect(result.id).toMatch(/^[a-z][a-z0-9._-]*$/);
  });

  it('categorizes correctly for games', () => {
    const result = generator.generate({
      name: 'Snake',
      description: 'A fun snake game with levels and high scores',
    });

    const manifest = result.manifest as { categories: string[] };
    expect(manifest.categories).toContain('games');
  });

  it('categorizes correctly for development tools', () => {
    const result = generator.generate({
      name: 'Debugger',
      description: 'A code debugger for developers with breakpoints',
    });

    const manifest = result.manifest as { categories: string[] };
    expect(manifest.categories).toContain('development');
  });
});
