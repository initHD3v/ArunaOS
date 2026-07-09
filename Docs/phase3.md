# Phase 3 — Core System Services & System Foundation

**Version:** 0.2.0
**Status:** Draft
**Depends On:** Phase 0, Phase 1, Phase 2

---

## Objective

Membangun seluruh layanan inti (Core Services) yang akan menjadi fondasi seluruh ArunaOS.

Phase ini memperkenalkan konsep **Operating Services**, yaitu sekumpulan service global yang dapat digunakan oleh seluruh module tanpa saling bergantung.

Pada akhir phase ini ArunaOS sudah mulai terasa sebagai sebuah Operating Environment, meskipun AI dan business module belum tersedia.

---

## Success Criteria

Seluruh poin berikut wajib terpenuhi.

- Global Event Bus berjalan (typed, <1ms dispatch).
- Service Container berjalan (registrasi, dependency check, lazy init).
- Notification System berjalan (termasuk Toast).
- Command Palette berjalan.
- Search Engine Foundation berjalan.
- Theme Engine final berjalan (extend next-themes).
- Settings Engine berjalan (single source of truth).
- Workspace Service berjalan.
- Shortcut Manager berjalan.
- Modal Manager berjalan.
- Storage Service berjalan.
- Logger Service berjalan.
- Application Lifecycle berjalan.
- Tidak terdapat circular dependency.
- Tidak terdapat duplicated state.
- Tidak terdapat memory leak.
- Tidak terdapat TypeScript Error.
- Tidak terdapat ESLint Warning.
- Seluruh service memiliki unit test (Vitest, coverage ≥80%).

---

## Deliverables

| No  | Service               | Type           | Lokasi                                  | Depends On                 |
| --- | --------------------- | -------------- | --------------------------------------- | -------------------------- |
| 1   | Event Bus             | Shared Package | `packages/services/event-bus`           | —                          |
| 2   | Service Container     | Shared Package | `packages/services/container`           | Event Bus                  |
| 3   | Logger                | Shared Package | `packages/services/logger`              | —                          |
| 4   | Storage Service       | Shared Package | `packages/services/storage`             | Logger                     |
| 5   | Settings Engine       | Shared Package | `packages/services/settings`            | Storage, Event Bus, Logger |
| 6   | Notification Service  | App Service    | `apps/web/src/services/notification`    | Event Bus, Logger          |
| 7   | Shortcut Manager      | App Service    | `apps/web/src/services/shortcut`        | Event Bus, Logger          |
| 8   | Modal Manager         | App Service    | `apps/web/src/services/modal`           | Overlay (existing), Logger |
| 9   | Theme Engine Final    | Shared Package | `packages/services/theme`               | Settings, Event Bus        |
| 10  | Search Foundation     | App Service    | `apps/web/src/services/search`          | Logger                     |
| 11  | Command Palette       | Feature        | `apps/web/src/features/command-palette` | Search, Shortcut, Modal    |
| 12  | Workspace Service     | App Service    | `apps/web/src/services/workspace`       | Event Bus, Logger          |
| 13  | Application Lifecycle | App Bootstrap  | `apps/web/src/services/lifecycle`       | Semua service              |

---

## Architecture

### Layer Overview

```text
Application (Next.js)
       ↓
Desktop Shell (Phase 1)
       ↓
Core Services (Phase 3) ←── Service Container
       ↓
Existing Phase 2 Components (Window Manager, Desktop Icons, Dock, etc.)
       ↓
Modules / Features
```

### Integration dengan Phase 1 & 2

Phase 3 **tidak rewrite** Phase 1 & 2. Sebaliknya:

| Existing Component                     | Integrasi dengan Phase 3                                                                                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Window Manager (`window.store.ts`)     | Tidak perlu "Window Service". Cukup buat adapter tipis di `services/window-adapter.ts` yang wrapping store existing untuk digunakan oleh service lain via Event Bus. |
| Theme (`next-themes`)                  | Theme Service jadi abstraction layer di atas `next-themes`. Tambah AMOLED, High Contrast, Custom Theme tanpa ganti library.                                          |
| Settings UI (`features/settings`)      | Settings UI menjadi konsumen Settings Service. Semua state pindah ke Settings Service sebagai single source of truth.                                                |
| Workspace Store (`workspace.store.ts`) | Diperluas menjadi Workspace Service. Multi-workspace support.                                                                                                        |
| Overlay (`features/overlay`)           | Modal Manager dibangun di atas Overlay yang sudah ada, bukan buat dari nol.                                                                                          |
| Context Menu (`features/context-menu`) | Tetap standalone. Tidak perlu jadi service.                                                                                                                          |

---

## Core Services

Core Services merupakan layer global yang menyediakan seluruh service untuk ArunaOS.

Seluruh module wajib menggunakan service ini.

Tidak diperbolehkan membuat service sendiri di dalam module.

### Service List (Final)

| Service           | Type   | Description                                         |
| ----------------- | ------ | --------------------------------------------------- |
| Event Bus         | Shared | Typed publish/subscribe event system                |
| Service Container | Shared | Registry + DI container                             |
| Logger            | Shared | Structured logging (dev=console, prod=silent)       |
| Storage           | Shared | Abstraksi IndexedDB + localStorage + sessionStorage |
| Theme             | Shared | Light/Dark/System/AMOLED/HighContrast               |
| Settings          | Shared | Single source of truth untuk semua konfigurasi      |
| Notification      | App    | Notifikasi + Toast (unified)                        |
| Shortcut          | App    | Keyboard shortcut registry + conflict detection     |
| Modal             | App    | Alert/Confirm/Prompt dengan stack management        |
| Search            | App    | Search index untuk modules, settings, icons         |
| Workspace         | App    | Workspace management + active window tracking       |

---

## Service Container

Semua service diregistrasikan melalui Service Container.

```typescript
interface ServiceContainer {
  register<T>(name: string, factory: () => T, deps?: string[]): void;
  get<T>(name: string): T;
  has(name: string): boolean;
  bootstrap(): Promise<void>; // init semua service, detect circular deps
}
```

Aturan:

- **Type-safe** — generic parameter untuk setiap service.
- **Lazy initialization** — service dibuat saat pertama kali di-`get`.
- **Singleton** — satu instance per service.
- **Circular dependency detection** — diverifikasi saat `bootstrap()`.

```text
ServiceContainer
  ├── Logger
  ├── Storage
  ├── EventBus
  ├── Theme       → depends on: Settings, EventBus
  ├── Settings    → depends on: Storage, EventBus, Logger
  ├── Notification → depends on: EventBus, Logger
  ├── Workspace   → depends on: EventBus, Logger
  ├── Search      → depends on: Logger
  ├── Shortcut    → depends on: EventBus, Logger
  └── Modal       → depends on: Logger
```

**Tidak diperbolehkan** melakukan import silang antar service secara langsung.
Semua komunikasi cross-service via Event Bus.

---

## Event Bus

ArunaOS menggunakan Event Driven Architecture. Event Bus adalah tulang punggung komunikasi.

### Specification

```typescript
type EventHandler<T = unknown> = (payload: T) => void;

interface EventBus {
  emit<T>(event: string, payload: T): void; // sync dispatch
  emitAsync<T>(event: string, payload: T): Promise<void>; // microtask-based
  on<T>(event: string, handler: EventHandler<T>): () => void; // return unsubscribe
  once<T>(event: string, handler: EventHandler<T>): void;
  off<T>(event: string, handler: EventHandler<T>): void;
  clear(): void; // cleanup semua listeners
}
```

### Performance Target

- `emit` → `<1ms` (synchronous, tanpa microtask).
- Single listener → `<0.05ms`.
- 100 listener → `<0.5ms`.

### Event Naming

Format: `domain:action`

```text
window:opened
window:closed
window:focused
workspace:changed
theme:changed
settings:updated
notification:created
notification:dismissed
modal:opened
modal:closed
shortcut:registered
search:triggered
app:ready
app:sleep
app:resume
```

Menggunakan `:` (colon) bukan `.` (dot) agar konsisten dengan CSS namespace dan menghindari konflik dengan property dot notation di runtime.

### Event Flow Example

```text
User Cmd+K
  ↓
Shortcut Manager emits "search:triggered"
  ↓
Event Bus broadcasts
  ├── Command Palette opens (via Shortcut)
  ├── Logger logs the action
  └── Analytics (future) records usage
```

### Memory Leak Prevention

- `on()` mengembalikan fungsi `unsubscribe` — **wajib** dipanggil di cleanup.
- Dev mode: warning jika component mount tanpa cleanup listener.
- `clear()` untuk cleanup global (saat app lifecycle shutdown).

---

## Settings Engine

Settings Engine adalah **single source of truth** untuk seluruh konfigurasi ArunaOS.

### Architecture

```text
Settings UI (features/settings) — konsumen
       ↓
Settings Service (packages/services/settings) — source of truth
       ↓
Storage Service (packages/services/storage) — persist ke IndexedDB
       ↓
Event Bus → semua service lain re-apply saat settings berubah
```

### Scope

- Appearance (theme, wallpaper, accent color)
- Language & Locale
- Accessibility (reduced motion, font scale, contrast)
- Keyboard (custom shortcuts — future)
- Startup (restore windows, default workspace)
- Developer Options (debug mode, feature flags)

### Schema

Settings memiliki schema yang terdefinisi dan versioned:

```typescript
interface SettingsSchema {
  version: number; // untuk migrasi
  theme: 'light' | 'dark' | 'system' | 'amoled' | 'high-contrast';
  wallpaper: { index: number; blur: number };
  language: string;
  accessibility: {
    reducedMotion: boolean;
    fontScale: number; // 0.8 - 1.2
  };
  startup: {
    restoreWindows: boolean;
  };
  dev: {
    debugMode: boolean;
  };
}
```

Setiap perubahan memicu event `settings:updated` via Event Bus.

---

## Theme Engine Final

### Strategy: Extend, Jangan Ganti

Phase 1 sudah menggunakan `next-themes` untuk Light/Dark/System. Theme Engine Phase 3 adalah **abstraction layer di atas `next-themes`**, bukan pengganti.

```
Theme Service
  ├── next-themes (runtime: Light/Dark/System)
  ├── AMOLED mode  → CSS class + custom variables
  ├── High Contrast → CSS class + custom variables
  └── Custom Theme  → user-defined CSS variables (future)
```

### Support

| Mode          | Implementation                                         |
| ------------- | ------------------------------------------------------ |
| Light         | `next-themes` (existing)                               |
| Dark          | `next-themes` (existing)                               |
| System        | `next-themes` (existing)                               |
| AMOLED        | CSS class `.theme-amoled` + pure black background      |
| High Contrast | CSS class `.theme-high-contrast` + WCAG AAA colors     |
| Custom Theme  | User-defined CSS variables disimpan di Storage Service |

### Theme Persistence

Theme disimpan di Settings Service (Storage Service → IndexedDB), bukan langsung localStorage.
Ini memungkinkan future cloud sync tanpa migrasi data.

---

## Notification System (Unified dengan Toast)

Notification dan Toast adalah satu service dengan dua display mode.

### Service API

```typescript
interface NotificationService {
  notify(
    type: 'info' | 'success' | 'warning' | 'error',
    message: string,
    options?: {
      duration?: number; // default: 5000, 0 = persistent
      action?: { label: string; handler: () => void };
      toast?: boolean; // true = toast (top-right, ringan)
    },
  ): string; // return id

  dismiss(id: string): void;
  dismissAll(): void;
  getQueue(): Notification[];
  onAction(callback: (notification: Notification) => void): () => void;
}
```

### Notification vs Toast

| Aspek       | Notification                 | Toast            |
| ----------- | ---------------------------- | ---------------- |
| Posisi      | Notification Center (panel)  | Top Right        |
| Durasi      | 5s atau manual close         | 3s auto-close    |
| Queue       | Unlimited                    | Max 5            |
| Stack       | Bisa ditumpuk                | Tidak            |
| Interaction | Bisa ada action button       | Click to dismiss |
| ARIA        | `role="alert"` + `aria-live` | `role="status"`  |

### Flow

```text
notify()
  ↓
Notification Service
  ├── → Toast (jika options.toast=true) → Top Right → Auto Close 3s
  └── → Notification (default) → Queue → Display → Auto Close 5s / Manual Close
  ↓
Event Bus emits "notification:created"
  ↓
Logger logs
```

---

## Shortcut Manager

### Integration with Existing Code

Phase 2 sudah memiliki `use-global-keys.ts` hook. Shortcut Manager adalah **service layer** di atasnya.

```typescript
interface ShortcutService {
  register(
    id: string,
    shortcut: string,
    handler: () => void,
    options?: {
      context?: 'global' | 'modal' | 'window'; // priority layer
      description?: string;
      preventable?: boolean; // event.preventDefault()
    },
  ): void;

  unregister(id: string): void;
  getRegistry(): ShortcutEntry[];
  setEnabled(enabled: boolean): void; // disable saat modal open
}
```

### Priority Layers

| Layer  | Contoh                  | Dominasi  |
| ------ | ----------------------- | --------- |
| Modal  | Escape = close modal    | Tertinggi |
| Window | Cmd+W = close window    |           |
| Global | Cmd+K = command palette | Terendah  |

Shortcut dari layer lebih tinggi override layer lebih rendah.

### Conflict Detection

Saat registrasi, Shortcut Manager cek:

```text
Cmd+K sudah diregister untuk "command-palette"
  ↓
Ada konflik dengan shortcut lain?
  ↓
Ya → dev warning, registrasi tetap jalan (last register wins)
```

---

## Modal Manager

Dibangun di atas **Overlay** yang sudah ada di Phase 2.

```typescript
interface ModalManager {
  alert(title: string, message: string): Promise<void>;
  confirm(title: string, message: string): Promise<boolean>;
  prompt(title: string, message: string, defaultValue?: string): Promise<string | null>;
  close(): void;
  closeAll(): void;
}
```

### Features

- **Stack-based** — modal baru di atas modal lama. Escape = close top modal.
- **Focus trap** — Tab/Shift+Tab loop di dalam modal.
- **Animation** — fade + scale (spring, reuse dari existing pattern).
- **Keyboard** — Enter = confirm, Escape = cancel/close.
- **ARIA** — `role="dialog"`, `aria-modal="true"`.

### Implementation

```
ModalManager
  ↓
Overlay (existing dari Phase 2)
  ↓
ModalStack (array of modal configs)
  ↓
Render di Portal
```

---

## Search Foundation

### Scope (V1)

Search hanya mencari metadata yang sudah di-index, belum full-text search konten.

| Source        | Index                                 |
| ------------- | ------------------------------------- |
| Modules       | `{ id, name, description, keywords }` |
| Desktop Icons | `{ name, type }`                      |
| Settings      | `{ key, label, category }`            |

### Service API

```typescript
interface SearchService {
  index(type: string, items: Searchable[]): void;
  remove(type: string, id: string): void;
  query(q: string): SearchResult[];
  clear(): void;
}

interface Searchable {
  id: string;
  label: string;
  keywords?: string[];
  category?: string;
}

interface SearchResult {
  type: string;
  id: string;
  label: string;
  description?: string;
  action: () => void; // what to do when selected
}
```

### Performance Target

- Index 1000 items → <50ms
- Query "te" → <5ms (fuzzy match)
- Query "settings" → <2ms (exact match)

---

## Command Palette

Command Palette adalah **UI dari Search Foundation**.

### Trigger

`Cmd+K` (registered via Shortcut Manager)

### Content

```text
> [search input] _____________
─────────────────────────────────
Recent
  Settings
  Files
  AI (Coming Soon)
─────────────────────────────────
Actions
  Toggle Theme
  Open Finder
  Open AStat
```

### Behavior

| Input      | Action                                     |
| ---------- | ------------------------------------------ |
| Empty      | Show recent / frequent items               |
| Typing     | Search via Search Service (<50ms response) |
| Arrow keys | Navigate list                              |
| Enter      | Execute selected action                    |
| Escape     | Close palette                              |

### Future

- AI-powered actions (natural language → action)
- Recent/frequent items ranking

---

## Workspace Service

### Extends existing workspace.store.ts

```typescript
interface WorkspaceService {
  getActiveWorkspace(): Workspace;
  getWorkspaces(): Workspace[];
  setActiveWorkspace(id: string): void;
  getActiveWindow(): string | null;
  setActiveWindow(windowId: string): void;
  getRecentWindows(): string[];
}
```

### Workspace State

```typescript
interface Workspace {
  id: string;
  name: string;
  windows: string[]; // window IDs
  activeWindowId: string | null;
  wallpaper?: number; // override per workspace
}
```

V1 hanya support single workspace. Multi-workspace adalah future.

Workspace Service emit event `workspace:changed` via Event Bus saat workspace atau active window berubah.

---

## Storage Service

### Abstraction Layer

```typescript
interface StorageService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}
```

### Backend Strategy

| Prioritas | Backend      | Use Case                               |
| --------- | ------------ | -------------------------------------- |
| 1         | IndexedDB    | Data besar, settings, blobs            |
| 2         | localStorage | Fallback jika IndexedDB tidak tersedia |

### Schema Versioning

```typescript
interface StorageMeta {
  version: number;
  migratedAt: number;
}
```

Setiap migration ditulis sebagai fungsi terpisah dan dijalankan saat app startup:

```text
Detect storage version < current version
  ↓
Run migration scripts (version 1 → 2, 2 → 3, etc.)
  ↓
Update version
```

---

## Logger Service

### Specification

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerService {
  debug(module: string, message: string, data?: unknown): void;
  info(module: string, message: string, data?: unknown): void;
  warn(module: string, message: string, data?: unknown): void;
  error(module: string, message: string, data?: unknown): void;
}

// Structured log entry
interface LogEntry {
  timestamp: number;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
}
```

### Environment Behavior

| env         | Level                       | Output                                      |
| ----------- | --------------------------- | ------------------------------------------- |
| development | debug + info + warn + error | Console dengan styling + collapsible groups |
| production  | warn + error                | Console (silent untuk debug/info)           |

### Future

- Buffer log entries (max 100)
- Batch send ke remote endpoint
- User-facing "Report Issue" dengan log snapshot

---

## Application Lifecycle

### Startup Sequence (Synchronous, <500ms total)

```text
Next.js Hydration
  ↓
ServiceContainer.bootstrap()
  ├── Logger.init()
  ├── Storage.init()
  ├── EventBus.init()
  ├── Theme.init()
  ├── Settings.init()
  ├── Notification.init()
  ├── Workspace.init()
  ├── Search.init()
  ├── Shortcut.init()
  └── Modal.init()
  ↓
EventBus.emit("app:ready")
  ↓
DesktopShell mount
  ↓
Restore state dari Storage (windows, workspace)
  ↓
Interactive
```

### Future

```text
app:sleep     → pause all timers, save session state
app:resume    → restore state, restart timers
app:shutdown  → save all state, cleanup listeners, clear interval/RAF
```

---

## Folder Structure

### packages/services (Shared — Platform Agnostic)

```text
packages/services/
  event-bus/
    src/
      event-bus.ts          → EventBus implementation
      types.ts              → EventPayload types
      index.ts
    package.json
    tsconfig.json

  container/
    src/
      container.ts          → ServiceContainer
      types.ts              → ServiceFactory, ServiceDefinition
      index.ts
    package.json
    tsconfig.json

  logger/
    src/
      logger.ts             → LoggerService implementation
      types.ts
      index.ts
    package.json
    tsconfig.json

  storage/
    src/
      storage.ts            → StorageService implementation
      adapters/
        indexed-db.ts       → IndexedDB adapter
        local-storage.ts    → LocalStorage fallback
      types.ts
      index.ts
    package.json
    tsconfig.json

  theme/
    src/
      theme-service.ts      → ThemeService (wraps next-themes)
      presets/
        amoled.ts
        high-contrast.ts
      types.ts
      index.ts
    package.json
    tsconfig.json

  settings/
    src/
      settings-service.ts   → SettingsService
      schema.ts             → SettingsSchema + validation
      migrations.ts         → Schema migration v1→v2→...
      types.ts
      index.ts
    package.json
    tsconfig.json
```

### apps/web/src/services (App-Specific)

```text
apps/web/src/services/
  notification/
    notification-service.ts
    notification-store.ts    → Zustand store untuk UI state
    notification-ui.tsx      → Notification panel component
    toast-ui.tsx            → Toast container component
    types.ts

  shortcut/
    shortcut-service.ts
    use-shortcut.ts          → React hook wrapping service

  modal/
    modal-service.ts
    modal-ui.tsx             → Modal renderer
    alert.tsx                → Alert preset
    confirm.tsx              → Confirm preset
    prompt.tsx              → Prompt preset

  search/
    search-service.ts
    search-index.ts          → In-memory search index
    use-search.ts            → React hook

  workspace/
    workspace-service.ts
    workspace-adapter.ts     → Bridge ke existing workspace.store.ts

  lifecycle/
    bootstrap.ts             → Startup sequence orchestrator
    use-lifecycle.ts         → React hook

  window-adapter.ts          → Bridge ke existing window.store.ts
```

### apps/web/src/features (UI Feature)

```text
apps/web/src/features/
  command-palette/
    components/
      command-palette.tsx    → UI, modal-style overlay
      command-item.tsx
      command-input.tsx
    hooks/
      use-command-palette.ts
    index.ts

  notification/              → UI components only (service di services/notification/)
    components/
      notification-item.tsx
      notification-list.tsx
      toast-container.tsx
      toast-item.tsx
```

---

## Providers

```text
App (layout.tsx)
  ↓
QueryProvider (existing — TanStack Query)
  ↓
ServiceProvider (BARU)    ←── init ServiceContainer, bootstrap semua service
  ↓
ThemeProvider (existing — next-themes + Theme Service)
  ↓
ShortcutProvider (BARU)   ←── global shortcut listener
  ↓
DesktopShell
```

### ServiceProvider Responsibilities

1. Panggil `ServiceContainer.bootstrap()`.
2. Set semua service ke React context.
3. Handle error saat service gagal init (tampilkan fallback UI, jangan blank screen).
4. Cleanup saat app unmount.

---

## State Management

### Zustand Stores (Existing + Baru)

| Store                   | Status           | Type                                          |
| ----------------------- | ---------------- | --------------------------------------------- |
| `window.store.ts`       | Existing Phase 2 | Zustand (plain)                               |
| `desktop.store.ts`      | Existing Phase 2 | Zustand (persist)                             |
| `workspace.store.ts`    | Existing Phase 2 | Zustand → Migrate ke Workspace Service        |
| `ui.store.ts`           | Existing Phase 2 | Zustand (plain) → tambah modal state          |
| `auth.store.ts`         | Existing Phase 2 | Zustand (persist) — tetap standalone          |
| `files.store.ts`        | Existing Phase 2 | Zustand (persist) — tetap standalone          |
| `notification-store.ts` | Baru             | Zustand (plain) — untuk UI notification queue |

### Rule

- Service layer = logic + event emission
- Zustand store = UI state (apa yang tampil)
- Service mengelola data, store mengelola tampilan

Contoh: Notification Service menerima `notify()`, menyimpan data, emit event, lalu `notification-store.ts` (Zustand) mengupdate UI. Service tidak tahu React.

---

## Migration Strategy: Phase 2 → Phase 3

### Approach: Incremental, Bukan Rewrite

Target **zero regression** — semua fitur Phase 2 harus tetap berjalan selama migrasi.

| Step | Action                                                 | Risk                                          |
| ---- | ------------------------------------------------------ | --------------------------------------------- |
| 1    | Buat Event Bus + Service Container + Logger (P0)       | None — service baru, belum dipakai            |
| 2    | Buat Storage Service + Settings Engine (P1)            | Medium — settings jadi single source of truth |
| 3    | Migrasi Theme ke Theme Service (P1)                    | Low — abstraction di atas next-themes         |
| 4    | Buat Notification Service + UI (P1)                    | None — fitur baru                             |
| 5    | Buat Shortcut Manager + integrasi use-global-keys (P2) | Low — register ulang shortcut existing        |
| 6    | Buat Modal Manager + integrasi Overlay (P2)            | Low — wrapper di atas existing overlay        |
| 7    | Buat Search + Command Palette (P2)                     | None — fitur baru                             |
| 8    | Perluas Workspace Store → Workspace Service (P3)       | Low — add multi-workspace infra               |
| 9    | Application Lifecycle (P3)                             | Low — orchestrator                            |

Di akhir setiap step: **build harus tetap hijau, semua fitur existing tetap berfungsi**.

---

## Error Handling Strategy

### Service Bootstrap Failure

```text
ServiceContainer.bootstrap()
  ↓
Service A gagal init
  ├── Dev: throw error + console.error + detail stack
  └── Prod: log error, service di-skip, app tetap jalan dengan fallback
  ↓
EventBus.emit("service:error", { name: "A", error })
  ↓
NotificationService.notify("error", "Service A failed to initialize")
```

### Runtime Error di Service

- Service harus wrapping logic di try/catch.
- Error dikirim ke Logger + Event Bus.
- Notification ditampilkan untuk error yang user-visible.
- Service tetap dalam state valid (tidak corrupt).

### Fallback Strategy

| Service      | Fallback                                    |
| ------------ | ------------------------------------------- |
| Storage      | localStorage sebagai fallback IndexedDB     |
| Theme        | force dark mode jika theme service error    |
| Settings     | default settings jika load gagal            |
| Notification | silent drop jika notification service error |

---

## Performance Measurement

### Tools

- **Vitest Bench** — untuk mengukur fungsi hot path (Event Bus emit, Search query).
- **React DevTools Profiler** — render timing untuk komponen UI.
- **Lighthouse CI** — bundle size, startup time, FPS.

### Target + Measurement Method

| Metric                            | Target       | How to Measure                       |
| --------------------------------- | ------------ | ------------------------------------ |
| Event Bus emit                    | `<1ms`       | `performance.now()` di test          |
| Search query (1000 items)         | `<50ms`      | Vitest bench                         |
| Command Palette open → render     | `<100ms`     | React Profiler                       |
| Theme switch → DOM update         | `<50ms`      | `performance.now()` di theme service |
| Notification render               | `<16ms`      | React Profiler                       |
| Startup (hydration → interactive) | `<2s`        | Lighthouse                           |
| Bundle size (core services only)  | `<50KB gzip` | `next/bundle-analyzer`               |

---

## Accessibility

| Component       | Requirement                                        |
| --------------- | -------------------------------------------------- |
| Notification    | `role="alert"`, `aria-live="polite"`               |
| Toast           | `role="status"`, `aria-live="polite"`              |
| Command Palette | `role="combobox"`, keyboard only, arrow navigation |
| Modal           | `role="dialog"`, `aria-modal="true"`, focus trap   |
| Shortcut        | Screen reader labels untuk setiap shortcut         |
| Theme Switch    | `prefers-reduced-motion`, `prefers-color-scheme`   |

---

## Testing Requirements

### Framework: Vitest (sudah terkonfigurasi di package.json)

### Coverage Target: ≥80% per service

### Test Categories

| Service               | Test Cases                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Event Bus**         | emit → handler called; multiple listeners; unsubscribe; once; async emit; memory leak (no leak after unsub); performance (<1ms) |
| **Service Container** | register → get; circular dep detection; singleton; lazy init                                                                    |
| **Logger**            | dev output; prod silent; structured format                                                                                      |
| **Storage**           | set → get → delete; IndexedDB adapter; localStorage fallback; schema migration                                                  |
| **Settings**          | schema validation; persist → load; migrate version; event emitted on update                                                     |
| **Theme**             | switch mode; persist; CSS variable applied                                                                                      |
| **Notification**      | queue; auto close; manual dismiss; toast max 5; event emitted                                                                   |
| **Shortcut**          | register → trigger; conflict detection; priority layer; unregister                                                              |
| **Modal**             | alert → resolve; confirm → true/false; prompt → string; stack behavior; escape close                                            |
| **Search**            | index → query; remove; fuzzy match; empty query                                                                                 |
| **Workspace**         | set active window; get recent windows; event emitted                                                                            |
| **Command Palette**   | open → render; search input → filter; keyboard nav; enter → execute; escape → close                                             |

### Test Example (Event Bus)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createEventBus } from './event-bus';

describe('EventBus', () => {
  it('should call handler on emit', () => {
    const bus = createEventBus();
    const handler = vi.fn();
    bus.on('test:event', handler);
    bus.emit('test:event', { data: 1 });
    expect(handler).toHaveBeenCalledWith({ data: 1 });
  });

  it('should not leak after unsubscribe', () => {
    const bus = createEventBus();
    const handler = vi.fn();
    const unsub = bus.on('test:event', handler);
    unsub();
    bus.emit('test:event', {});
    expect(handler).not.toHaveBeenCalled();
  });
});
```

---

## Implementation Roadmap (Milestone)

### Sprint 1 (P0) — Foundation (3 hari)

| Day | Deliverable                                                                   |
| --- | ----------------------------------------------------------------------------- |
| 1   | Event Bus (typed, emit/on/once/off, unsubscribe, async)                       |
| 2   | Service Container (register/get, circular dep, lazy init, bootstrap) + Logger |
| 3   | Bootstrap integration with `apps/web` + Providers                             |

**Gate:** Semua P0 service punya unit test, build hijau.

### Sprint 2 (P1) — Core Data Layer (3 hari)

| Day | Deliverable                                                              |
| --- | ------------------------------------------------------------------------ |
| 1   | Storage Service (IndexedDB + localStorage fallback + schema versioning)  |
| 2   | Settings Engine (schema, validation, persist, event, migration)          |
| 3   | Theme Engine Final (AMOLED, High Contrast, abstraction over next-themes) |

**Gate:** Settings + Theme bisa persist dan di-restore.

### Sprint 3 (P1) — User-Facing Services (3 hari)

| Day | Deliverable                                                                         |
| --- | ----------------------------------------------------------------------------------- |
| 1   | Notification Service (unified with Toast, queue, auto-close, event) + UI components |
| 2   | Modal Manager (alert/confirm/prompt, stack, focus trap) + UI                        |
| 3   | Integration: Settings UI menggunakan Settings Engine + Theme Service                |

**Gate:** Notification dan Modal bisa dipakai oleh feature manapun.

### Sprint 4 (P2) — Productivity (3 hari)

| Day | Deliverable                                                                            |
| --- | -------------------------------------------------------------------------------------- |
| 1   | Search Foundation (search index, fuzzy query, typed sources)                           |
| 2   | Shortcut Manager (register, priority, conflict detection) + migrate existing shortcuts |
| 3   | Command Palette (UI, keyboard nav, integration with Search + Shortcut)                 |

**Gate:** Cmd+K membuka Command Palette yang bisa search + execute.

### Sprint 5 (P3) — Polish (2 hari)

| Day | Deliverable                                                                       |
| --- | --------------------------------------------------------------------------------- |
| 1   | Workspace Service (expand existing store, event emission) + Window Adapter        |
| 2   | Application Lifecycle (bootstrap orchestration, sleep/resume/shutdown foundation) |

**Gate:** Semua service exit criteria terpenuhi.

### Total: ~14 hari

---

## Exit Criteria

Phase 3 selesai apabila:

- Event Bus berjalan dengan typed events, unsubscribe, dan memory leak-free.
- Service Container berjalan dengan registrasi dependency check.
- Settings Engine berjalan sebagai single source of truth (bukan scattered di berbagai store).
- Theme Engine final berjalan (Light, Dark, System, AMOLED, High Contrast).
- Notification Center + Toast berjalan (unified service).
- Search Foundation berjalan (index + query).
- Command Palette berjalan (Cmd+K → search → execute).
- Shortcut Manager berjalan (register, priority, conflict detection).
- Modal Manager berjalan (alert, confirm, prompt, stack, focus trap).
- Storage Service berjalan (IndexedDB + localStorage fallback + schema migration).
- Logger berjalan (dev console, prod silent).
- Workspace Service berjalan (active window tracking, event emission).
- Application Lifecycle berjalan (bootstrap sequence).
- Semua service dapat digunakan oleh module.
- Tidak terdapat circular dependency.
- Tidak terdapat duplicated state.
- Tidak terdapat TypeScript Error.
- Tidak terdapat ESLint Warning.
- Seluruh service memiliki unit test dengan coverage ≥80%.
- Build hijau, Lighthouse Performance ≥90.

---

## Deliverable Preview

```text
┌──────────────────────────────────────────────────────────────┐
                            Menu Bar
────────────────────────────────────────────────────────────────
Desktop
┌──────────────────────────────┐
│  Command Palette (Cmd+K)     │
│  > [search...]               │
│  ─────────────────────────── │
│  Recent                      │
│    Settings                  │
│    Files                     │
│    AI (Coming Soon)          │
│  ─────────────────────────── │
│  Actions                     │
│    Toggle Theme              │
│    Open Finder               │
└──────────────────────────────┘

┌──────────────────────────────┐
│  🔔 Notification Center      │
│  ✔ Theme Changed             │
│  ⚠ Storage 80% full         │
└──────────────────────────────┘

─────────────────────────────────────────────────────────────────
                          Dock
─────────────────────────────────────────────────────────────────
```

---

## Milestone Output

Pada akhir Phase 3, ArunaOS telah memiliki seluruh **Core Operating Services** yang akan digunakan oleh semua fitur berikutnya.

Desktop Environment kini memiliki fondasi sistem yang lengkap meliputi:

- **Foundation:** Event Bus, Service Container, Logger, Storage
- **Configuration:** Theme Engine, Settings Engine
- **Interaction:** Notification & Toast, Shortcut Manager, Modal Manager
- **Productivity:** Search Foundation, Command Palette
- **Orchestration:** Workspace Service, Application Lifecycle

Phase berikutnya (Phase 4) akan mulai membangun **Application Runtime**, sehingga ArunaOS dapat menjalankan aplikasi (Modules) secara nyata melalui Runtime Engine yang terisolasi dan siap diintegrasikan dengan AI.
