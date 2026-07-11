import type { ExternalModuleManifest } from './types';

export type TrustLevel = 'trusted' | 'low-risk' | 'medium-risk' | 'high-risk';

export interface SecurityScore {
  score: number;
  level: TrustLevel;
  breakdown: ScoreBreakdown[];
  warnings: string[];
}

export interface ScoreBreakdown {
  category: string;
  score: number;
  maxScore: number;
  detail: string;
}

const PERMISSION_WEIGHTS: Record<string, number> = {
  'storage:read': 5,
  'storage:write': 15,
  camera: 20,
  microphone: 20,
  notification: 5,
  'clipboard:read': 10,
  'clipboard:write': 15,
  network: 15,
  geolocation: 20,
};

export class SecurityRatingSystem {
  async analyze(
    manifest: ExternalModuleManifest,
    options?: {
      checksumVerified?: boolean;
      source?: 'registry' | 'url';
    },
  ): Promise<SecurityScore> {
    const breakdown: ScoreBreakdown[] = [];
    const warnings: string[] = [];
    let totalScore = 0;

    // 1. Permissions (max 30 points, high weight)
    const permScore = this.analyzePermissions(manifest);
    breakdown.push(permScore);
    totalScore += permScore.score;

    if (permScore.warning) warnings.push(permScore.warning);

    // 2. Checksum verification (max 20 points)
    const checksumVerified = options?.checksumVerified ?? false;
    if (checksumVerified) {
      breakdown.push({
        category: 'Checksum',
        score: 20,
        maxScore: 20,
        detail: 'SHA-256 checksum verified',
      });
      totalScore += 20;
    } else {
      breakdown.push({
        category: 'Checksum',
        score: 0,
        maxScore: 20,
        detail: 'Checksum not verified',
      });
      warnings.push('Module checksum not verified — integrity unknown');
    }

    // 3. Source trust (max 15 points)
    const source = options?.source ?? 'url';
    if (source === 'registry') {
      breakdown.push({
        category: 'Source',
        score: 15,
        maxScore: 15,
        detail: 'Installed from official registry',
      });
      totalScore += 15;
    } else {
      breakdown.push({
        category: 'Source',
        score: 5,
        maxScore: 15,
        detail: 'Installed from direct URL',
      });
      warnings.push('Module sourced from direct URL — verify the source');
    }

    // 4. Metadata completeness (max 15 points)
    const metaScore = this.analyzeMetadata(manifest);
    breakdown.push(metaScore);
    totalScore += metaScore.score;

    if (metaScore.warning) warnings.push(metaScore.warning);

    // 5. Version stability (max 10 points)
    const versionScore = this.analyzeVersion(manifest.version);
    breakdown.push(versionScore);
    totalScore += versionScore.score;

    // 6. Cryptographic signature verification (max 10 points)
    const sigVerified = await this.verifySignature(manifest);
    if (sigVerified === true) {
      breakdown.push({
        category: 'Signature',
        score: 10,
        maxScore: 10,
        detail: 'Ed25519 signature cryptographically verified',
      });
      totalScore += 10;
    } else if (sigVerified === false) {
      breakdown.push({
        category: 'Signature',
        score: 0,
        maxScore: 10,
        detail: 'Signature present but verification failed — possible tampering',
      });
      warnings.push('Cryptographic signature verification failed — module may be tampered');
    } else if (manifest.signature) {
      breakdown.push({
        category: 'Signature',
        score: 5,
        maxScore: 10,
        detail: 'Signature present but not verified (browser context)',
      });
      totalScore += 5;
    } else {
      breakdown.push({
        category: 'Signature',
        score: 0,
        maxScore: 10,
        detail: 'No signature — authenticity not verifiable',
      });
    }

    // Clamp to 0-100
    totalScore = Math.max(0, Math.min(100, totalScore));

    const level = this.scoreToLevel(totalScore);

    return { score: totalScore, level, breakdown, warnings };
  }

  private analyzePermissions(
    manifest: ExternalModuleManifest,
  ): ScoreBreakdown & { warning?: string } {
    const perms = manifest.permissions ?? [];
    let score = 30;
    let warning: string | undefined;

    if (perms.length === 0) {
      // No permissions = safest
      return {
        category: 'Permissions',
        score: 30,
        maxScore: 30,
        detail: 'No permissions requested',
      };
    }

    // Deduct for each permission based on its weight
    for (const perm of perms) {
      const weight = PERMISSION_WEIGHTS[perm] ?? 5;
      score -= weight;
    }

    // Deduct extra for having many permissions
    if (perms.length > 3) {
      score -= (perms.length - 3) * 3;
      warning = `Requests ${perms.length} permissions — consider limiting to only what's needed`;
    }

    // Check for high-risk permissions
    const highRisk = ['camera', 'microphone', 'geolocation'] as const;
    for (const hr of highRisk) {
      if (perms.includes(hr)) {
        warning = `Requests '${hr}' — sensitive permission, verify the module's purpose`;
        break;
      }
    }

    return {
      category: 'Permissions',
      score: Math.max(0, score),
      maxScore: 30,
      detail:
        perms.length === 1
          ? `Requests 1 permission: ${perms[0]}`
          : `Requests ${perms.length} permissions: ${perms.join(', ')}`,
      warning,
    };
  }

  private analyzeMetadata(manifest: ExternalModuleManifest): ScoreBreakdown & { warning?: string } {
    let score = 0;
    const maxScore = 15;
    const details: string[] = [];

    if (manifest.author && manifest.author.length > 0) {
      score += 5;
      details.push('Author provided');
    } else {
      details.push('No author');
    }

    if (manifest.homepage && manifest.homepage.startsWith('http')) {
      score += 5;
      details.push('Homepage provided');
    } else {
      details.push('No homepage');
    }

    if (manifest.categories && manifest.categories.length > 0) {
      score += 5;
      details.push(
        `${manifest.categories.length} categor${manifest.categories.length === 1 ? 'y' : 'ies'}`,
      );
    } else {
      details.push('No categories');
    }

    return {
      category: 'Metadata',
      score,
      maxScore,
      detail: details.join(' | ') || 'No metadata',
      warning:
        score < 10 ? 'Incomplete metadata — author, homepage, or categories missing' : undefined,
    };
  }

  private analyzeVersion(version: string): ScoreBreakdown {
    const parts = version.split('.').map(Number);
    const major = parts[0] ?? 0;
    const minor = parts[1] ?? 0;

    // Major version 0 = early development
    if (major === 0) {
      return {
        category: 'Version',
        score: 3,
        maxScore: 10,
        detail: `Version ${version} — early development (major 0)`,
      };
    }

    // Major version >= 1
    if (major >= 1) {
      // Higher major = more stable
      const stability = Math.min(10, major * 2 + (minor === 0 ? 3 : 2));
      return {
        category: 'Version',
        score: stability,
        maxScore: 10,
        detail: `Version ${version} — ${major}.${minor} stable release`,
      };
    }

    return { category: 'Version', score: 5, maxScore: 10, detail: `Version ${version}` };
  }

  private async verifySignature(manifest: ExternalModuleManifest): Promise<boolean | null> {
    if (!manifest.signature) return null;
    if (typeof window !== 'undefined') return null;
    if (
      !('signaturePublicKey' in manifest) ||
      !(manifest as ExternalModuleManifest & { signaturePublicKey?: string }).signaturePublicKey
    )
      return null;

    try {
      const { createHash, verify } = (await import('crypto')) as typeof import('crypto');
      const data = JSON.stringify({
        id: manifest.id,
        version: manifest.version,
        checksum: manifest.checksum,
        manifest,
      });
      const hash = new Uint8Array(createHash('sha256').update(data).digest());
      const publicKeyPem = (manifest as ExternalModuleManifest & { signaturePublicKey?: string })
        .signaturePublicKey!;
      const sigBuf = new Uint8Array(Buffer.from(manifest.signature, 'base64'));
      return verify(null, hash, publicKeyPem, sigBuf);
    } catch {
      return false;
    }
  }

  private scoreToLevel(score: number): TrustLevel {
    if (score >= 80) return 'trusted';
    if (score >= 60) return 'low-risk';
    if (score >= 40) return 'medium-risk';
    return 'high-risk';
  }
}
