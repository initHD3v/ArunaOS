import { describe, it, expect } from 'vitest';
import { ModulePermissions, PERMISSION_DESCRIPTIONS, MODULE_PERMISSION_MAP } from '../permissions';

describe('ModulePermissions', () => {
  it('should grant permissions', () => {
    const perms = new ModulePermissions();
    perms.grant('mod.a', ['storage:read', 'notification']);
    expect(perms.has('mod.a', 'storage:read')).toBe(true);
    expect(perms.has('mod.a', 'notification')).toBe(true);
    expect(perms.has('mod.a', 'camera')).toBe(false);
  });

  it('should revoke a permission', () => {
    const perms = new ModulePermissions();
    perms.grant('mod.a', ['storage:read', 'notification']);
    perms.revoke('mod.a', 'storage:read');
    expect(perms.has('mod.a', 'storage:read')).toBe(false);
    expect(perms.has('mod.a', 'notification')).toBe(true);
  });

  it('should revoke all permissions', () => {
    const perms = new ModulePermissions();
    perms.grant('mod.a', ['storage:read', 'notification']);
    perms.revokeAll('mod.a');
    expect(perms.has('mod.a', 'storage:read')).toBe(false);
    expect(perms.getGranted('mod.a')).toHaveLength(0);
  });

  it('should return false for unknown module', () => {
    const perms = new ModulePermissions();
    expect(perms.has('unknown', 'storage:read')).toBe(false);
  });

  it('should return granted permissions list', () => {
    const perms = new ModulePermissions();
    perms.grant('mod.a', ['storage:read', 'notification', 'network']);
    const granted = perms.getGranted('mod.a');
    expect(granted).toContain('storage:read');
    expect(granted).toContain('notification');
    expect(granted).toContain('network');
    expect(granted).toHaveLength(3);
  });

  it('should return empty array for unknown module', () => {
    const perms = new ModulePermissions();
    expect(perms.getGranted('unknown')).toEqual([]);
  });

  it('should check permission without throwing', () => {
    const perms = new ModulePermissions();
    perms.grant('mod.a', ['storage:read']);
    expect(() => perms.check('mod.a', 'storage:read')).not.toThrow();
  });

  it('should throw on check for missing permission', () => {
    const perms = new ModulePermissions();
    perms.grant('mod.a', ['storage:read']);
    expect(() => perms.check('mod.a', 'camera')).toThrow('Permission denied');
  });

  it('should throw on check for unknown module', () => {
    const perms = new ModulePermissions();
    expect(() => perms.check('unknown', 'storage:read')).toThrow('Permission denied');
  });

  it('should auto-grant known built-in module', () => {
    const perms = new ModulePermissions();
    perms.autoGrant('arunaos.files');
    expect(perms.has('arunaos.files', 'storage:read')).toBe(true);
    expect(perms.has('arunaos.files', 'storage:write')).toBe(true);
    expect(perms.has('arunaos.files', 'notification')).toBe(true);
  });

  it('should not throw on auto-grant for unknown module', () => {
    const perms = new ModulePermissions();
    expect(() => perms.autoGrant('unknown.mod')).not.toThrow();
  });

  it('should accumulate granted permissions', () => {
    const perms = new ModulePermissions();
    perms.grant('mod.a', ['storage:read']);
    perms.grant('mod.a', ['notification']);
    expect(perms.getGranted('mod.a')).toHaveLength(2);
  });

  it('should have all permission descriptions defined', () => {
    const perms = [
      'storage:read',
      'storage:write',
      'camera',
      'microphone',
      'notification',
      'clipboard:read',
      'clipboard:write',
      'network',
      'geolocation',
    ];
    for (const p of perms) {
      expect(PERMISSION_DESCRIPTIONS[p as keyof typeof PERMISSION_DESCRIPTIONS]).toBeTruthy();
    }
  });

  it('should have MODULE_PERMISSION_MAP for all built-ins', () => {
    const builtins = [
      'arunaos.files',
      'arunaos.settings',
      'arunaos.astat',
      'arunaos.camera',
      'arunaos.ai',
    ];
    for (const id of builtins) {
      expect(MODULE_PERMISSION_MAP[id]).toBeTruthy();
    }
  });

  it('should not leak modules between grants', () => {
    const perms = new ModulePermissions();
    perms.grant('mod.a', ['camera']);
    perms.grant('mod.b', ['network']);
    expect(perms.has('mod.a', 'network')).toBe(false);
    expect(perms.has('mod.b', 'camera')).toBe(false);
  });

  it('should be safe to revoke non-granted permission', () => {
    const perms = new ModulePermissions();
    expect(() => perms.revoke('mod.a', 'storage:read')).not.toThrow();
  });

  it('should be safe to revokeAll for unknown module', () => {
    const perms = new ModulePermissions();
    expect(() => perms.revokeAll('unknown')).not.toThrow();
  });
});
