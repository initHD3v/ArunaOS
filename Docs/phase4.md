# Phase 4 — Application Runtime & Module System

**Version:** 0.3.0
**Status:** Draft
**Depends On:** Phase 0, 1, 2, 3

---

## Objective

Membangun **Application Runtime Engine** yang memungkinkan ArunaOS menjalankan aplikasi (Modules) secara nyata. Phase 4 mengubah ArunaOS dari Desktop Environment statis menjadi **Operating Environment yang bisa menjalankan kode**.

Module bisa berasal dari:

- **Built-in** — aplikasi yang sudah terinstall bawaan (Settings, Files, AStat, Camera, dll.)
- **External** — aplikasi yang di-load dari URL / manifest eksternal (future)
- **AI-generated** — aplikasi yang dibuat oleh AI saat runtime (super future)

Pada akhir phase ini ArunaOS sudah bisa menjalankan, mengelola, dan mengkomunikasikan antar aplikasi layaknya sebuah OS sungguhan.

---

## Success Criteria

- Module Registry berjalan (daftar semua aplikasi, status, metadata)
- Module Loader berjalan (lazy load, sandbox, lifecycle)
- Module Communication berjalan (IPC via Event Bus)
- Module Lifecycle berjalan (install, uninstall, enable, disable)
- Window Manager terintegrasi dengan Module System
- Module Manifest spec selesai
- Module dapat memiliki Preferences sendiri
- Module Access Control (izin: storage, camera, notification, dll.)
- Module Developer Mode (hot reload, devtools)
- Contoh Module: Files Explorer yang sudah jadi Module pertama
- Tidak terdapat circular dependency
- Tidak terdapat memory leak
- Build hijau

---

## Deliverables

| No  | Komponen                | Type         | Lokasi                                   | Depends On             |
| --- | ----------------------- | ------------ | ---------------------------------------- | ---------------------- |
| 1   | Module Manifest Spec    | Spec         | `Docs/module-manifest.md`                | —                      |
| 2   | Module Registry         | Core Service | `packages/runtime/registry`              | Event Bus, Storage     |
| 3   | Module Loader           | Core Service | `packages/runtime/loader`                | Registry, Logger       |
| 4   | Module Sandbox          | Core Service | `packages/runtime/sandbox`               | Event Bus              |
| 5   | Module IPC              | Core Service | `packages/runtime/ipc`                   | Event Bus              |
| 6   | Module Lifecycle        | Core Service | `packages/runtime/lifecycle`             | Registry, Loader       |
| 7   | Module Settings         | Core Service | `packages/runtime/settings`              | Settings Service       |
| 8   | Module Store            | Core Service | `packages/runtime/store`                 | Zustand                |
| 9   | Window Manager Bridge   | Integration  | `apps/web/src/services/module-window.ts` | Module IPC, Window Mgr |
| 10  | Module Devtools         | Feature      | `apps/web/src/features/module-devtools`  | Module Registry        |
| 11  | Module Installer UI     | Feature      | `apps/web/src/features/module-installer` | Module Registry, Modal |
| 12  | Files Module (refactor) | Example      | `apps/web/src/features/files`            | Module Runtime         |
| 13  | Module Permissions      | Core Service | `packages/runtime/permissions`           | Storage, Modal         |

---

## Architecture

### Layer Overview

```text
Application (Next.js)
       ↓
Desktop Shell (Phase 1)
       ↓
Core Services (Phase 3)
       ↓
Application Runtime (Phase 4)  ←── NEW
       ↓
Modules (Built-in / External / AI-generated)
```

### Module Runtime Architecture

```text
Module Registry
  ├── Metadata (id, name, version, icon, description)
  ├── Status (installed, active, suspended, error)
  └── Manifest (entry point, permissions, dependencies)

Module Loader
  ├── Resolve manifest
  ├── Load entry point (ESM dynamic import)
  ├── Initialize sandbox
  └── Mount ke DOM target

Module IPC
  ├── Send message ke module lain
  ├── Broadcast event
  ├── Request/Response pattern
  └── Event subscription antar module

Module Sandbox
  ├── Isolated scope (Proxy-based atau iframe)
  ├── API terbatas (hanya yang diizinkan)
  └── Resource limit (memory, CPU)
```

---

## Module Manifest

Setiap module memiliki manifest file `module.json`:

```json
{
  "id": "arunaos.files",
  "name": "Files",
  "version": "1.0.0",
  "description": "File manager for ArunaOS",
  "icon": "folder",
  "entry": "./index.tsx",
  "type": "builtin",
  "permissions": ["storage:read", "storage:write"],
  "window": {
    "defaultWidth": 900,
    "defaultHeight": 600,
    "minWidth": 400,
    "minHeight": 300,
    "resizable": true,
    "titleBar": true
  },
  "shortcuts": ["Ctrl+F"],
  "dependencies": [],
  "api": {
    "expose": ["getFiles", "openFile"],
    "require": ["notification", "modal", "clipboard"]
  }
}
```

### Manifest Fields

| Field          | Required | Description                        |
| -------------- | -------- | ---------------------------------- |
| `id`           | ✅       | Unique identifier (reverse domain) |
| `name`         | ✅       | Display name                       |
| `version`      | ✅       | Semver                             |
| `description`  | ✅       | Short description                  |
| `icon`         | ✅       | Icon name atau path                |
| `entry`        | ✅       | Entry point file (ESM)             |
| `type`         | ✅       | `builtin`, `external`, `system`    |
| `permissions`  |          | Array of permission strings        |
| `window`       |          | Window configuration defaults      |
| `shortcuts`    |          | Default keyboard shortcuts         |
| `dependencies` |          | Module IDs yang dibutuhkan         |
| `api`          |          | Exposed and required API           |

---

## Module Registry

Service untuk mendaftarkan, mencari, dan mengelola module.

```typescript
interface ModuleRegistry {
  register(manifest: ModuleManifest, factory: () => Promise<ModuleInstance>): void;
  unregister(id: string): Promise<void>;
  get(id: string): ModuleEntry | null;
  getAll(): ModuleEntry[];
  search(query: string): ModuleEntry[];
  getByCategory(category: string): ModuleEntry[];

  // Status management
  setStatus(id: string, status: ModuleStatus): void;
  getStatus(id: string): ModuleStatus;

  // Events
  onRegistered(callback: (entry: ModuleEntry) => void): () => void;
  onUnregistered(callback: (id: string) => void): () => void;
}

type ModuleStatus = 'registered' | 'loading' | 'active' | 'suspended' | 'error';

interface ModuleEntry {
  manifest: ModuleManifest;
  status: ModuleStatus;
  instance: ModuleInstance | null;
  error?: Error;
}
```

### Built-in Modules (Initial Registry)

| ID                 | Name             | Type    | Status      |
| ------------------ | ---------------- | ------- | ----------- |
| `arunaos.settings` | Settings         | builtin | ✅ Existing |
| `arunaos.files`    | Files            | builtin | ✅ Existing |
| `arunaos.astat`    | Activity Monitor | builtin | ✅ Existing |
| `arunaos.camera`   | Camera           | builtin | ✅ Existing |
| `arunaos.ai`       | AI Chat          | builtin | 🚧 Planned  |

---

## Module Loader

Bertanggung jawab me-load module ke runtime.

```typescript
interface ModuleLoader {
  load(id: string): Promise<ModuleInstance>;
  unload(id: string): Promise<void>;
  reload(id: string): Promise<ModuleInstance>;
  getLoadedModules(): Map<string, ModuleInstance>;
}
```

### Loading Sequence

```text
ModuleRegistry.get(id)
  ↓
Resolve entry point path
  ↓
Dynamic import (import())
  ↓
Instance factory call
  ↓
ModuleIPC.connect(instance)
  ↓
ModuleLifecycle.onMount()
  ↓
Render ke DOM (jika punya UI)
  ↓
Status → 'active'
```

### Lazy Loading

Module tidak di-load saat startup. Module di-load saat:

- User membuka module dari Dock / Desktop
- Module lain memanggil API module ini
- System membutuhkan module (misal: Settings untuk render panel)

---

## Module IPC (Inter-Process Communication)

Komunikasi antar module melalui Event Bus dengan namespace terisolasi.

```typescript
interface ModuleIPC {
  // Request/Response
  request<T = unknown>(moduleId: string, method: string, params?: unknown): Promise<T>;

  // Event-based
  on(moduleId: string, event: string, handler: (payload: unknown) => void): () => void;
  emit(moduleId: string, event: string, payload: unknown): void;

  // Broadcast
  broadcast(event: string, payload: unknown): void;

  // System API (module ke system)
  system(method: string, params?: unknown): Promise<unknown>;
}
```

### Communication Patterns

```text
Module A                Module IPC               Module B
  │                        │                        │
  │── request("B", ────────│───────────────────────>│
  │   "getData", {})       │                        │── proses request
  │<── ────────────────────│────────────────────────│
  │   { data: [...] }      │                        │
  │                        │                        │
  │                        │                        │
  │── emit("B", ───────────│───────────────────────>│
  │   "data:updated", {})  │                        │── handle event
  │                        │                        │
  │                        │                        │
  │── broadcast(───────────│──> Module A            │
  │   "system:themeChange",│──> Module B            │
  │   { theme: "dark" })   │──> Module C            │
```

### System API (yang bisa dipanggil module)

```typescript
interface SystemAPI {
  // Window
  openWindow(config: WindowConfig): string;
  closeWindow(id: string): void;
  minimizeWindow(id: string): void;
  maximizeWindow(id: string): void;

  // Notification
  notify(type: string, message: string, options?: object): string;

  // Storage
  storage: {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
  };

  // Settings
  settings: {
    get<T>(key: string): T;
    set<T>(key: string, value: T): Promise<void>;
  };

  // Theme
  theme: {
    getMode(): string;
    setMode(mode: string): Promise<void>;
  };
}
```

---

## Module Sandbox

Setiap module berjalan di scope terisolasi dengan akses terbatas.

### V1: Proxy-based Sandbox

Untuk V1, gunakan JavaScript Proxy untuk membatasi akses module ke global scope:

```typescript
interface ModuleSandbox {
  createSandbox(manifest: ModuleManifest): Window;
  execute(moduleId: string, code: string): unknown;
  destroy(moduleId: string): void;
}
```

### V2: iframe Sandbox (Future)

Untuk module dari sumber tidak terpercaya (external), gunakan iframe dengan `sandbox` attribute.

### Permissions

Module harus mendeklarasikan permission di manifest, dan system akan mengecek saat module mencoba mengakses API:

```typescript
const PERMISSIONS = {
  'storage:read': 'Membaca file',
  'storage:write': 'Menulis/menghapus file',
  camera: 'Mengakses kamera',
  microphone: 'Mengakses mikrofon',
  notification: 'Mengirim notifikasi',
  'clipboard:read': 'Membaca clipboard',
  'clipboard:write': 'Menulis ke clipboard',
  network: 'Akses jaringan',
  geolocation: 'Lokasi',
} as const;
```

---

## Module Lifecycle

Setiap module memiliki lifecycle yang terdefinisi:

```typescript
interface ModuleLifecycle {
  onInstall?(): Promise<void>; // Pertama kali diinstall
  onUninstall?(): Promise<void>; // Dihapus
  onMount?(): Promise<void>; // Window dibuka
  onUnmount?(): Promise<void>; // Window ditutup
  onSleep?(): Promise<void>; // System sleep
  onResume?(): Promise<void>; // System resume
  onThemeChange?(): void; // Theme berubah
  onSettingsChange?(): void; // Settings berubah
}
```

### Flow

```text
Install
  ├── Registry.register(manifest)
  ├── Simpan ke Storage
  └── ModuleLifecycle.onInstall()

Load (saat dibuka)
  ├── ModuleLoader.load(id)
  ├── Sandbox.create()
  ├── IPC.connect()
  ├── ModuleLifecycle.onMount()
  └── Render UI

Close
  ├── ModuleLifecycle.onUnmount()
  ├── IPC.disconnect()
  └── Cleanup DOM

Uninstall
  ├── ModuleLifecycle.onUninstall()
  ├── Registry.unregister(id)
  └── Hapus dari Storage
```

---

## Integration dengan Phase 2 & 3

### Window Manager Integration

Window Manager yang sudah ada di Phase 2 perlu diintegrasikan dengan Module System:

```typescript
// services/module-window.ts
class ModuleWindowService {
  openModule(moduleId: string, params?: object): string {
    const entry = registry.get(moduleId);
    if (!entry) throw new Error(`Module ${moduleId} not found`);

    // Load module if not loaded
    if (entry.status !== 'active') {
      await loader.load(moduleId);
    }

    // Create window via existing WindowManager
    const windowId = windowManager.openWindow({
      id: `module-${moduleId}-${Date.now()}`,
      title: entry.manifest.name,
      icon: entry.manifest.icon,
      content: () => <ModuleRenderer moduleId={moduleId} />,
      ...entry.manifest.window,
    });

    return windowId;
  }
}
```

### Phase 3 Integration

| Phase 3 Service   | Peran di Phase 4                              |
| ----------------- | --------------------------------------------- |
| Event Bus         | Backbone Module IPC (namespace per module)    |
| Service Container | Registrasi Module Runtime services            |
| Logger            | Log module activity (dev + error reporting)   |
| Storage           | Simpan module data + preferences              |
| Settings          | Module preferences + permissions              |
| Notification      | Module bisa kirim notifikasi ke user          |
| Modal             | Module bisa buka modal (confirm, alert, dll.) |
| Search            | Module bisa daftarin search items             |
| Shortcut          | Module bisa register shortcut                 |
| Workspace         | Track module windows sebagai bagian workspace |

---

## Module Developer Mode

Untuk developer yang ingin membuat module:

### DevTools Panel (Cmd+Shift+M)

- Daftar semua module + status
- Module Inspector (event, state, performance)
- Hot reload (watch file changes → reload module)
- Error log per module
- Permission simulator

### Module Scaffolding

```bash
pnpm arunaos create-module my-module
```

Struktur yang dihasilkan:

```text
modules/my-module/
├── module.json          # Manifest
├── index.tsx            # Entry point
├── components/
│   └── App.tsx
├── store.ts             # Module-local state (optional)
├── api.ts               # Exposed API (optional)
└── styles.css           # Scoped styles
```

---

## Refactor: Files Module

Files Explorer (yang sudah ada di Phase 2) akan direfactor menjadi Module pertama yang menggunakan Module Runtime.

### Current State (Phase 2)

- `features/files/components/finder.tsx` — standalone component
- `files.store.ts` — Zustand store sendiri
- Terintegrasi dengan Desktop Icons via import langsung

### Target State (Phase 4)

- `modules/arunaos.files/` — folder sendiri
- Menggunakan Module Manifest
- Menggunakan Module IPC untuk komunikasi
- Window dikelola oleh ModuleWindowService
- Masih bisa diakses dari Desktop Icons + Dock

---

## Folder Structure Tambahan

```text
packages/
  runtime/
    src/
      registry.ts         → ModuleRegistry
      loader.ts           → ModuleLoader
      sandbox.ts          → ModuleSandbox (proxy-based V1)
      ipc.ts              → ModuleIPC
      lifecycle.ts        → ModuleLifecycleManager
      permissions.ts      → ModulePermissions
      store.ts            → ModuleStore (Zustand)
      index.ts

apps/web/src/
  services/
    module-window.ts      → Module ↔ Window Manager bridge
    module-installer.ts   → Module installer service

  features/
    module-devtools/
      components/
        module-list.tsx
        module-inspector.tsx
        module-log.tsx
      module-devtools.tsx

    module-installer/
      components/
        install-from-url.tsx
        installed-modules.tsx
      module-installer.tsx

modules/                    ← Built-in modules directory
  arunaos.files/
    module.json
    index.tsx
    components/
      finder.tsx
    store.ts
    api.ts

  arunaos.settings/
    module.json
    index.tsx

  arunaos.astat/
    module.json
    index.tsx

  arunaos.camera/
    module.json
    index.tsx

  arunaos.ai/
    module.json
    index.tsx
```

---

## Implementation Roadmap

### Sprint 1 — Foundation (3 hari)

| Day | Deliverable                                                      |
| --- | ---------------------------------------------------------------- |
| 1   | Module Manifest spec + validasi + ModuleRegistry service         |
| 2   | Module Loader (dynamic import, status tracking, error handling)  |
| 3   | ModuleIPC + ModuleLifecycle + integrasi dengan Event Bus Phase 3 |

**Gate:** Module bisa di-register, di-load, dan dikomunikasikan via IPC.

### Sprint 2 — Integration Layer (3 hari)

| Day | Deliverable                                                     |
| --- | --------------------------------------------------------------- |
| 1   | Module Sandbox (Proxy-based scope isolation)                    |
| 2   | ModuleWindowService (integrasi Module + Window Manager Phase 2) |
| 3   | SystemAPI + Module Permissions                                  |

**Gate:** Module bisa dibuka sebagai window, punya akses terbatas.

### Sprint 3 — Files Module Refactor (2 hari)

| Day | Deliverable                                          |
| --- | ---------------------------------------------------- |
| 1   | Refactor Files Explorer menjadi module arunaos.files |
| 2   | Integrasi Desktop Icons + Dock dengan module system  |

**Gate:** Files Explorer adalah module pertama yang fully integrated.

### Sprint 4 — Developer Tools (2 hari)

| Day | Deliverable                                              |
| --- | -------------------------------------------------------- |
| 1   | Module DevTools panel (list, status, inspect, error log) |
| 2   | Module Installer UI (daftar + install module dari URL)   |

**Gate:** Developer bisa inspect module dan install module baru.

### Total: ~10 hari

---

## Exit Criteria

Phase 4 selesai apabila:

- Module Registry berjalan — module bisa didaftarkan, dicari, dan distatuskan.
- Module Loader berjalan — module bisa di-load secara lazy via dynamic import.
- Module IPC berjalan — module bisa berkomunikasi dengan module lain dan system.
- Module Lifecycle berjalan — onMount, onUnmount, onSleep, onResume.
- Module Sandbox V1 berjalan — Proxy-based isolation.
- Module Permissions berjalan — akses terbatas sesuai manifest.
- Module dapat dibuka sebagai window melalui Window Manager.
- Files Explorer sudah menjadi module pertama yang fully integrated.
- Module DevTools berfungsi minimal (daftar + status + error log).
- Tidak terdapat circular dependency.
- Tidak terdapat TypeScript Error.
- Tidak terdapat ESLint Warning.
- Build hijau.

---

## Future (Post-Phase 4)

Fitur yang sengaja ditunda ke phase berikutnya:

| Fitur                  | Phase | Notes                                            |
| ---------------------- | ----- | ------------------------------------------------ |
| External Module Loader | 5     | Load module dari URL / CDN                       |
| iframe Sandbox (V2)    | 5     | Untuk module tidak terpercaya                    |
| Hot Module Reload      | 5     | Dev experience improvement                       |
| Module Store (Market)  | 5+    | Download module dari community                   |
| AI-generated Module    | AI    | AI bikin module on-the-fly dari natural language |
