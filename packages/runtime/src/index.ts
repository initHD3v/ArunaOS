export { ModuleRegistry } from './registry';
export { ModuleLoader } from './loader';
export type { ModuleFactory } from './loader';
export { ModuleIPC } from './ipc';
export { ModuleLifecycleManager } from './lifecycle';
export { ModuleSandbox } from './sandbox';
export { ModulePermissions, PERMISSION_DESCRIPTIONS, MODULE_PERMISSION_MAP } from './permissions';
export { ModuleSettings } from './settings';
export { ModuleStore } from './store';
export type { ModuleStoreState } from './store';
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
