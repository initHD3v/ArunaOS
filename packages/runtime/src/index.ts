export { ModuleRegistry } from './registry';
export { ModuleLoader } from './loader';
export type { ModuleFactory } from './loader';
export { ModuleIPC } from './ipc';
export { ModuleLifecycleManager } from './lifecycle';
export { ModuleSandbox } from './sandbox';
export { SandboxV2 } from './sandbox-v2';
export type { SandboxV2Config, ResourceLimits } from './sandbox-v2';
export { ModulePermissions, PERMISSION_DESCRIPTIONS, MODULE_PERMISSION_MAP } from './permissions';
export { ModuleSettings } from './settings';
export { ModuleStore } from './store';
export type { ModuleStoreState } from './store';
export { ExternalModuleLoader } from './external-loader';
export { SecurityRatingSystem } from './security-rating';
export type { SecurityScore, TrustLevel, ScoreBreakdown } from './security-rating';
export { RegistryClient } from './registry-client';
export type { RegistrySearchResult, RegistryModuleInfo, RegistrySearchParams, RegistryManifestResponse } from './registry-client';
export type {
  ExternalModuleManifest,
  ExternalModuleEntry,
  UpdateInfo,
} from './types';
export type {
  ModuleManifest,
  ModuleEntry,
  ModuleStatus,
  ModuleType,
  ModuleInstance,
  ModuleLifecycleHooks,
  ModuleWindowConfig,
  ModuleAPIConfig,
  IPCMessage,
  SystemAPI,
  Permission,
} from './types';
