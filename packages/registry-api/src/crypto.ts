import type { SignModuleParams } from './types';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface SignatureResult {
  signature: string;
  publicKey: string;
}

let keyPairPromise: Promise<KeyPair> | null = null;

async function getKeyPair(): Promise<KeyPair> {
  if (keyPairPromise) return keyPairPromise;
  keyPairPromise = (async () => {
    const stored = process.env.REGISTRY_PRIVATE_KEY;
    if (stored) {
      return {
        privateKey: stored,
        publicKey: process.env.REGISTRY_PUBLIC_KEY ?? '',
      };
    }
    const { generateKeyPairSync } = await import('node:crypto');
    const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    return { publicKey, privateKey };
  })();
  return keyPairPromise;
}

function canonicalJson(data: Record<string, unknown>): string {
  const keys = Object.keys(data).sort();
  const pairs = keys
    .map((k) => {
      const v = data[k];
      if (v === undefined) return null;
      return `${JSON.stringify(k)}:${JSON.stringify(v, (_, val) => val ?? undefined)}`;
    })
    .filter(Boolean);
  return `{${pairs.join(',')}}`;
}

export async function generateKeyPair(): Promise<KeyPair> {
  const { generateKeyPairSync } = await import('node:crypto');
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  return { publicKey, privateKey };
}

export async function signModule(params: SignModuleParams): Promise<SignatureResult> {
  const { createHash, sign } = await import('node:crypto');
  const { privateKey, publicKey } = await getKeyPair();

  const data = canonicalJson({
    id: params.id,
    version: params.version,
    checksum: params.checksum,
    manifest: params.manifest,
  });

  const hash = new Uint8Array(createHash('sha256').update(data).digest());
  const signature = sign(null, hash, privateKey);

  return {
    signature: signature.toString('base64'),
    publicKey,
  };
}

export async function verifyModuleSignature(
  params: SignModuleParams,
  signature: string,
  publicKeyPem: string,
): Promise<boolean> {
  try {
    const { createHash, verify } = await import('node:crypto');
    const data = canonicalJson({
      id: params.id,
      version: params.version,
      checksum: params.checksum,
      manifest: params.manifest,
    });

    const hash = new Uint8Array(createHash('sha256').update(data).digest());
    const sigBuf = new Uint8Array(Buffer.from(signature, 'base64'));
    return verify(null, hash, publicKeyPem, sigBuf);
  } catch {
    return false;
  }
}
