import type { Permission } from './types';

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  'storage:read': 'Membaca file',
  'storage:write': 'Menulis/menghapus file',
  camera: 'Mengakses kamera',
  microphone: 'Mengakses mikrofon',
  notification: 'Mengirim notifikasi',
  'clipboard:read': 'Membaca clipboard',
  'clipboard:write': 'Menulis ke clipboard',
  network: 'Akses jaringan',
  geolocation: 'Lokasi',
};

export const MODULE_PERMISSION_MAP: Record<string, Permission[]> = {
  'arunaos.files': ['storage:read', 'storage:write', 'notification'],
  'arunaos.settings': ['storage:read', 'storage:write', 'notification'],
  'arunaos.astat': ['notification'],
  'arunaos.camera': ['camera', 'notification'],
  'arunaos.ai': ['notification', 'clipboard:read', 'clipboard:write', 'network'],
};

export class ModulePermissions {
  private granted = new Map<string, Set<Permission>>();

  grant(moduleId: string, permissions: Permission[]): void {
    const existing = this.granted.get(moduleId) ?? new Set();
    permissions.forEach((p) => existing.add(p));
    this.granted.set(moduleId, existing);
  }

  revoke(moduleId: string, permission: Permission): void {
    this.granted.get(moduleId)?.delete(permission);
  }

  revokeAll(moduleId: string): void {
    this.granted.delete(moduleId);
  }

  has(moduleId: string, permission: Permission): boolean {
    return this.granted.get(moduleId)?.has(permission) ?? false;
  }

  getGranted(moduleId: string): Permission[] {
    return Array.from(this.granted.get(moduleId) ?? []);
  }

  check(moduleId: string, permission: Permission): void {
    if (!this.has(moduleId, permission)) {
      throw new Error(
        `Permission denied: '${permission}' for module '${moduleId}'. ` +
          `Requested permission: ${PERMISSION_DESCRIPTIONS[permission]}`,
      );
    }
  }

  autoGrant(moduleId: string): void {
    const perms = MODULE_PERMISSION_MAP[moduleId];
    if (perms) {
      this.grant(moduleId, perms);
    }
  }
}
