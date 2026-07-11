import { describe, it, expect } from 'vitest';
import { MemoryStore } from './store.memory';

describe('Module Publishing (MemoryStore)', () => {
  const store = new MemoryStore();

  it('publishes a new module', async () => {
    const result = await store.publishModule({
      id: 'com.example.newmod',
      name: 'New Module',
      version: '0.1.0',
      description: 'A brand new module',
      entry: './dist/bundle.js',
      checksum: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      bundleUrl: '/api/modules/com.example.newmod/download',
      author: 'Test Author',
      categories: ['tools'],
      permissions: ['network'],
    });

    expect(result.id).toBe('com.example.newmod');
    expect(result.version).toBe('0.1.0');

    const mod = await store.getModule('com.example.newmod');
    expect(mod).toBeDefined();
    expect(mod!.name).toBe('New Module');
    expect(mod!.author).toBe('Test Author');
    expect(mod!.downloads).toBe(0);

    const manifest = await store.getManifest('com.example.newmod');
    expect(manifest).toBeDefined();
    expect(manifest!.manifest.signature).toBeTruthy();
    expect(manifest!.manifest.signaturePublicKey).toBeTruthy();
  });

  it('publishes updated version of existing module', async () => {
    await store.publishModule({
      id: 'com.example.update',
      name: 'Update Test',
      version: '1.0.0',
      description: 'Initial version',
      entry: './dist/bundle.js',
      checksum: '1111111111111111111111111111111111111111111111111111111111111111',
      bundleUrl: '/api/modules/com.example.update/download',
    });

    const result = await store.publishModule({
      id: 'com.example.update',
      name: 'Update Test',
      version: '2.0.0',
      description: 'Updated version',
      entry: './dist/bundle.js',
      checksum: '2222222222222222222222222222222222222222222222222222222222222222',
      bundleUrl: '/api/modules/com.example.update/download',
    });

    expect(result.version).toBe('2.0.0');
    const mod = await store.getModule('com.example.update');
    expect(mod!.version).toBe('2.0.0');
  });

  it('increments download count', async () => {
    const initial = await store.getModule('arunaos.files');
    const before = initial!.downloads;

    await store.incrementDownloads('arunaos.files');
    const after = (await store.getModule('arunaos.files'))!.downloads;

    expect(after).toBe(before + 1);
  });

  it('appears in search after publish', async () => {
    const search = await store.search({ query: 'New Module' });
    expect(search.modules.some((m) => m.id === 'com.example.newmod')).toBe(true);
  });
});
