import { describe, it, expect } from 'vitest';
import { generateKeyPair, signModule, verifyModuleSignature } from './crypto';

describe('Module Crypto', () => {
  it('generates Ed25519 key pair', async () => {
    const keys = await generateKeyPair();
    expect(keys.publicKey).toContain('BEGIN PUBLIC KEY');
    expect(keys.privateKey).toContain('BEGIN PRIVATE KEY');
  });

  it('signs and verifies module data', async () => {
    const result = await signModule({
      id: 'com.example.test',
      version: '1.0.0',
      checksum: 'abc123',
      manifest: { name: 'Test' },
    });

    expect(result.signature).toBeTruthy();
    expect(result.publicKey).toBeTruthy();

    // Verify with correct key
    const valid = await verifyModuleSignature(
      { id: 'com.example.test', version: '1.0.0', checksum: 'abc123', manifest: { name: 'Test' } },
      result.signature,
      result.publicKey,
    );
    expect(valid).toBe(true);
  });

  it('rejects tampered data', async () => {
    const result = await signModule({
      id: 'com.example.test',
      version: '1.0.0',
      checksum: 'abc123',
      manifest: { name: 'Test' },
    });

    const valid = await verifyModuleSignature(
      {
        id: 'com.example.test',
        version: '1.0.0',
        checksum: 'tampered',
        manifest: { name: 'Test' },
      },
      result.signature,
      result.publicKey,
    );
    expect(valid).toBe(false);
  });

  it('rejects signature with wrong key', async () => {
    const key2 = await generateKeyPair();

    const result = await signModule({
      id: 'com.example.test',
      version: '1.0.0',
      checksum: 'abc123',
      manifest: { name: 'Test' },
    });

    const valid = await verifyModuleSignature(
      { id: 'com.example.test', version: '1.0.0', checksum: 'abc123', manifest: { name: 'Test' } },
      result.signature,
      key2.publicKey,
    );
    expect(valid).toBe(false);
  });
});
