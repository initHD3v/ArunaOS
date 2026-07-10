# Phase 5 — External Modules, Advanced Sandbox & Developer Experience

**Version:** 0.4.0
**Status:** Draft
**Depends On:** Phase 0, 1, 2, 3, 4

---

## Objective

Membangun ekosistem module yang terbuka untuk pihak ketiga serta meningkatkan Developer Experience (DX) dengan hot reload, debugging tools, dan sandbox yang lebih aman. Phase 5 mengubah ArunaOS dari platform module internal menjadi **platform ekstensi terbuka** di mana siapa pun bisa membuat, menguji, dan mendistribusikan module.

Module di Phase 5 bisa berasal dari:
- **External** — module yang di-load dari URL / manifest eksternal
- **Community** — module dari registry publik / marketplace
- **AI-generated** — module yang dibuat oleh AI saat runtime

---

## Success Criteria

- External module dapat di-load dari URL remote (ESM via dynamic import)
- iframe-based sandbox (V2) untuk module tidak terpercaya
- Hot Module Replacement (HMR) untuk development
- Module bundler / build tool untuk packaging module
- Module registry publik (API endpoint untuk daftar module)
- Module scoring & security rating system
- Developer CLI (`pnpm arunaos create-module`)
- Module Marketplace UI (jelajah, install, rating)
- AI-assisted module generation dari natural language
- Migration tools dari Phase 4 → Phase 5 module format
- Semua module Phase 4 tetap kompatibel
- Build hijau, TypeScript 0 error, circular dependency 0

---

## Deliverables

| No  | Komponen                | Type         | Lokasi                                   | Depends On             |
| --- | ----------------------- | ------------ | ---------------------------------------- | ---------------------- |
| 1   | External Module Loader  | Core Service | `packages/runtime/external-loader`       | ModuleLoader, Storage  |
| 2   | iframe Sandbox V2       | Core Service | `packages/runtime/sandbox-v2`            | ModuleSandbox V1       |
| 3   | Hot Module Reload       | Dev Service  | `packages/runtime/hot-reload`            | ModuleLoader, WebSocket|
| 4   | Module Bundler          | CLI Tool     | `packages/module-bundler/`               | esbuild / Rollup       |
| 5   | Module Registry API     | Service      | `packages/registry-api/`                 | Storage, Auth          |
| 6   | Module CLI              | CLI Tool     | `packages/module-cli/`                   | Module Bundler         |
| 7   | Module Marketplace      | Feature      | `apps/web/src/features/marketplace/`     | Registry API, Modal    |
| 8   | AI Module Generator     | Service      | `packages/ai/src/module-generator.ts`    | AI Engine (Phase 3)    |
| 9   | Module Migration Tool   | CLI Tool     | `packages/module-cli/src/migrate.ts`     | —                      |
| 10  | Security Rating System  | Core Service | `packages/runtime/security-rating`       | ModulePermissions      |

---

## Architecture

### Layer Overview (Updated)

```text
Application (Next.js)
       ↓
Desktop Shell (Phase 1)
       ↓
Core Services (Phase 3)
       ↓
Application Runtime (Phase 4)
       ↓
External Module System (Phase 5)  ←── NEW
       ↓
┌──────────────────────────────────────────┐
│           Module Sources                  │
│  Built-in  │  External  │  Marketplace   │
│  (Phase 4) │  (Phase 5) │  (Phase 5)     │
└──────────────────────────────────────────┘
```

### External Module Loading Flow

```text
User clicks "Install" on marketplace / URL
       ↓
Module Registry API fetch manifest
       ↓
Validate manifest (id, version, permissions)
       ↓
Security scan (permission risk assessment)
       ↓
User confirmation (permissions dialog)
       ↓
Download & cache module bundle
       ↓
Register in ModuleRegistry
       ↓
Load via ExternalModuleLoader
       ↓
Mount with iframe Sandbox V2 (if untrusted)
       ↓
Status → 'active'
```

### Sandbox V2 Architecture

```text
┌──────────────────────────────────┐
│         Parent Window             │
│  ┌────────────────────────────┐  │
│  │   iframe (sandbox attrs)    │  │
│  │  ┌──────────────────────┐  │  │
│  │  │   Module Code         │  │  │
│  │  │   (isolated scope)    │  │  │
│  │  └──────────────────────┘  │  │
│  │                            │  │
│  │  postMessage API:          │  │
│  │  • window.open             │  │
│  │  • notification            │  │
│  │  • storage.get/set         │  │
│  │  • settings.get/set        │  │
│  │  • ipc.request             │  │
│  │  └── all validated by      │  │
│  │      ModulePermissions     │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

---

## 1. External Module Loader

Memperluas `ModuleLoader` yang sudah ada di Phase 4 untuk mendukung loading dari URL remote.

### Interface

```typescript
interface ExternalModuleLoader {
  // Install dari URL manifest
  installFromUrl(url: string): Promise<string>;  // returns module id

  // Install dari manifest object
  install(manifest: ExternalModuleManifest): Promise<string>;

  // Uninstall module
  uninstall(id: string): Promise<void>;

  // Update module ke versi terbaru
  update(id: string): Promise<void>;

  // Cek update untuk semua module external
  checkForUpdates(): Promise<UpdateInfo[]>;

  // Daftar module external terinstall
  getInstalled(): ExternalModuleEntry[];
}
```

### External Module Manifest

```typescript
interface ExternalModuleManifest {
  id: string;                    // reverse domain (contoh: com.example.myapp)
  name: string;
  version: string;               // semver
  description: string;
  icon: string;                  // URL icon
  entry: string;                 // URL entry point (ESM)
  type: 'external';
  permissions: string[];         // permission yang dibutuhkan
  window: ModuleWindowConfig;
  api: ModuleAPIConfig;
  checksum: string;              // SHA-256 bundle integrity
  manifestUrl: string;           // URL manifest ini sendiri
  registry?: string;             // Registry asal (untuk update)
  updatedAt: string;             // ISO date
  signature?: string;            // Opsional: signed by registry
}
```

### Loading Sequence

```text
1. Validasi checksum manifest
2. Cek permissions vs user consent
3. Download entry file (ESM) dari URL
4. Verifikasi integrity via checksum/integrity hash
5. Cache ke IndexedDB (offline support)
6. Dynamic import via Blob URL atau import()
7. Register sebagai module external
8. Mount dengan sandbox yang sesuai:
   - Proxy Sandbox (V1) → jika trusted source
   - iframe Sandbox (V2) → jika untrusted source
```

---

## 2. iframe Sandbox V2

Sandbox berbasis iframe untuk module dari sumber tidak terpercaya.

### Spesifikasi teknis

```html
<iframe
  sandbox="allow-scripts allow-same-origin"
  src="about:blank"
  style="width:100%; height:100%; border:none"
/>
```

Atribut `sandbox` yang diizinkan:
- `allow-scripts` — wajib, biar module bisa jalan
- `allow-same-origin` — agar bisa comunicate via `postMessage`

Atribut yang **diblokir**:
- ❌ `allow-forms` — tidak perlu
- ❌ `allow-popups` — berbahaya
- ❌ `allow-top-navigation` — berbahaya
- ❌ `allow-modals` — ganti dengan system Modal
- ❌ `allow-presentation` — tidak perlu

### Bridge Communication

Module di dalam iframe berkomunikasi dengan system via `postMessage`:

```typescript
// Dari iframe ke parent
window.parent.postMessage(
  {
    type: 'api:request',
    id: string,           // unique request id
    method: string,       // nama API method
    params: unknown[],    // parameter
  },
  '*',  // origin dicentang di parent
);

// Dari parent ke iframe (response)
iframe.contentWindow.postMessage(
  {
    type: 'api:response',
    id: string,           // match request id
    result: unknown,
    error?: string,
  },
  '*',
);
```

### API yang tersedia di Sandbox V2

```typescript
interface SandboxAPI {
  // Storage terbatas (scoped per module)
  storage: {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
  };

  // Notification
  notify(title: string, message: string, icon?: string): void;

  // Window management
  openWindow(config: { width: number; height: number }): void;
  closeWindow(): void;

  // IPC terbatas
  ipc: {
    request(moduleId: string, method: string, params?: unknown): Promise<unknown>;
    on(event: string, handler: (payload: unknown) => void): () => void;
    emit(event: string, payload: unknown): void;
  };

  // HTTP fetch (terbatas)
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;

  // Logging
  logger: {
    info(msg: string, data?: unknown): void;
    warn(msg: string, data?: unknown): void;
    error(msg: string, data?: unknown): void;
  };
}
```

### Resource Limits

```typescript
interface ResourceLimits {
  maxMemory: number;         // bytes (default: 50MB)
  maxStorage: number;        // bytes (default: 10MB)
  maxFetchRequests: number;  // per minute (default: 60)
  maxInterval: number;       // ms (default: 100, minimum interval)
  maxAnimationFps: number;   // default: 30
}
```

Resource limit di-enforce oleh:
- `performance.measureUserAgentSpecificMemory()` — memory tracking
- IntersectionObserver — pause animasi saat tidak terlihat
- AbortController — timeout fetch requests
- Proxy pada `setTimeout`/`setInterval` — enforce minimum interval

---

## 3. Hot Module Reload

Untuk development mode, module bisa di-reload tanpa refresh halaman penuh.

### Interface

```typescript
interface HotReload {
  // Watch directory untuk perubahan file
  watch(moduleId: string, directory: string): void;

  // Trigger reload manual
  reload(moduleId: string): Promise<void>;

  // Event ketika module di-reload
  onReload(moduleId: string, callback: () => void): () => void;

  // Status
  isWatching(moduleId: string): boolean;

  // Stop watching
  unwatch(moduleId: string): void;
}
```

### Flow

```text
Developer edit file module
       ↓
File watcher (chokidar) detects change
       ↓
Module bundler rebuilds module
       ↓
WebSocket push ke browser
       ↓
ModuleLifecycle.onUnmount() — cleanup old instance
       ↓
Dynamic import ulang module bundle
       ↓
ModuleLifecycle.onMount() — init new instance
       ↓
Restore module window state
       ↓
DevTools log: "Module X hot-reloaded in 142ms"
```

### State Preservation

Saat hot reload, state module dipertahankan:
- ModuleStore (Zustand) → persist di memory
- Window position/size → tetap
- Event listeners → di-cleanup dan re-register
- Child components → React key-based remount

---

## 4. Module Bundler

Build tool untuk packaging module menjadi bundle ESM yang siap di-load.

### CLI

```bash
pnpm arunaos build-module ./my-module --out-dir ./dist
```

Output:
```
dist/
├── module.json          # Manifest (auto-generated)
├── index.js             # Entry point (ESM bundle)
├── style.css            # Styles (optional)
└── assets/              # Static assets (optional)
```

### Konfigurasi

```typescript
// arunaos.config.ts
import type { ModuleConfig } from '@arunaos/module-bundler';

const config: ModuleConfig = {
  entry: './index.tsx',
  external: ['react', 'react-dom'],  // jangan bundle
  format: 'esm',
  minify: true,
  sourcemap: true,
  css: true,                          // bundle CSS
  assets: ['./icons/*.png'],          // include assets
  integrity: 'sha256',                // hash untuk integrity check
};
```

---

## 5. Module Registry API

Backend service untuk menyimpan dan mendistribusikan module.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/modules` | Daftar module publik (pagination + search) |
| `GET` | `/api/v1/modules/:id` | Detail module + versi terbaru |
| `GET` | `/api/v1/modules/:id/versions` | Semua versi module |
| `GET` | `/api/v1/modules/:id/download/:version` | Download bundle |
| `POST` | `/api/v1/modules` | Publish module baru (auth required) |
| `POST` | `/api/v1/modules/:id/versions` | Publish versi baru |
| `PUT` | `/api/v1/modules/:id` | Update metadata module |
| `DELETE` | `/api/v1/modules/:id` | Unpublish module (owner only) |
| `GET` | `/api/v1/modules/:id/security` | Laporan keamanan module |
| `POST` | `/api/v1/modules/:id/review` | User review (auth required) |
| `GET` | `/api/v1/search?q=...` | Search modules |

### Database Schema (PostgreSQL + Drizzle ORM)

```typescript
const modules = pgTable('modules', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 512 }),
  authorId: varchar('author_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  downloads: integer('downloads').default(0),
  rating: decimal('rating', { precision: 2, scale: 1 }).default('0'),
  category: varchar('category', { length: 100 }),
  tags: text('tags').array(),
});

const moduleVersions = pgTable('module_versions', {
  id: serial('id').primaryKey(),
  moduleId: varchar('module_id', { length: 255 }).references(() => modules.id),
  version: varchar('version', { length: 20 }).notNull(),
  bundleUrl: varchar('bundle_url', { length: 1024 }).notNull(),
  checksum: varchar('checksum', { length: 64 }).notNull(),
  manifest: jsonb('manifest').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  securityScore: integer('security_score').default(100),
});
```

---

## 6. Module CLI

Developer CLI untuk membuat, build, dan publish module.

### Commands

```bash
# Scaffold module baru
pnpm arunaos create-module my-app
# → creates modules/my-app/ with template files

# Build module untuk production
pnpm arunaos build-module ./my-app --out-dir ./dist

# Build + watch untuk development
pnpm arunaos dev-module ./my-app

# Publish module ke registry (auth required)
pnpm arunaos publish ./dist

# Update module di registry
pnpm arunaos update my-app

# Migrasi module Phase 4 → Phase 5 format
pnpm arunaos migrate ./legacy-module

# Validate manifest
pnpm arunaos validate ./module.json

# Test module di environment lokal
pnpm arunaos test ./my-app
```

### Template Structure

```bash
pnpm arunaos create-module my-app
# Output:
my-app/
├── module.json
├── arunaos.config.ts
├── index.tsx
├── components/
│   └── App.tsx
├── api.ts
├── store.ts
├── styles.css
├── public/
│   └── icon.png
├── __tests__/
│   └── App.test.ts
├── README.md
└── .gitignore
```

---

## 7. Module Marketplace

UI untuk menjelajah, menginstall, dan mengelola module dari registry publik.

### Fitur

| Fitur | Description |
|-------|-------------|
| **Browse** | Grid module dengan search, filter kategori, sort by rating/downloads |
| **Detail** | Halaman detail module: description, screenshots, versions, reviews, security score |
| **Install** | One-click install dengan permission preview |
| **Update** | Notifikasi jika ada versi baru |
| **Manage** | Daftar module terinstall, enable/disable/uninstall |
| **Reviews** | Rating + review dari user lain |
| **Security** | Score keamanan, permission yang diminta, source code review |

### UI Components

```typescript
// marketplace.tsx — entry point
// components/
//   module-card.tsx       — Grid card (icon, name, rating, install button)
//   module-detail.tsx     — Full detail view
//   module-review.tsx     — Review form + list
//   install-dialog.tsx    — Permission confirmation dialog
//   update-notification.tsx — Badge untuk update tersedia
//   category-filter.tsx   — Sidebar filter
//   search-bar.tsx        — Search input dengan autocomplete
```

---

## 8. AI Module Generator

Memanfaatkan AI Engine (Phase 3) untuk membuat module dari deskripsi natural language.

### Interface

```typescript
interface AIModuleGenerator {
  // Generate module dari deskripsi
  generate(description: string): Promise<GeneratedModule>;

  // Preview module sebelum di-install
  preview(id: string): Promise<ModulePreview>;

  // Iterate module dengan feedback
  iterate(id: string, feedback: string): Promise<GeneratedModule>;

  // Deploy module ke runtime
  deploy(id: string): Promise<string>;  // returns module id
}
```

### Flow

```text
User: "Buatkan app todo list dengan dark mode"
       ↓
AI Engine generate:
  • module.json
  • index.tsx (component)
  • store.ts (state management)
  • style.css
       ↓
Preview di sandbox (user bisa coba dulu)
       ↓
User: "Tambahin fitur delete dengan swipe"
       ↓
AI Engine iterate:
  • Update component
  • Add gesture handler
       ↓
User klik "Install"
       ↓
Module registered + ready to use
```

### Limitation

AI-generated module berjalan di **iframe Sandbox V2** (terisolasi penuh) dan mendapat **security rating rendah** secara default sampai ada review manual atau community trust score.

---

## 9. Security Rating System

Setiap module external mendapat rating keamanan berdasarkan analisis statis.

### Scoring Factors

| Faktor | Bobot | Description |
|--------|-------|-------------|
| Permission Request | 25% | Semakin banyak permission sensitif, semakin rendah skor |
| Code Analysis | 30% | Deteksi pola berbahaya (eval, fetch ke unknown origin, dll.) |
| Source Trust | 20% | Official registry > community > unknown |
| Version History | 15% | Semakin lama di registry tanpa issue, semakin tinggi |
| Community Reports | 10% | Flagged oleh user lain |

### Rating Levels

| Score | Label | Color | Action |
|-------|-------|-------|--------|
| 90–100 | Trusted | 🟢 | Install tanpa warning |
| 70–89 | Safe | 🟡 | Install dengan confirmation |
| 40–69 | Caution | 🟠 | Warning dialog + detail risiko |
| 0–39 | Blocked | 🔴 | Tidak bisa di-install |

---

## Integration dengan Phase 1–4

### Phase 1 — Desktop Shell
- Marketplace bisa dibuka dari Dock / Launchpad
- Badge update notification di menu bar

### Phase 2 — Window Manager
- Module external dibuka sebagai window via ModuleWindowService
- Window title bar menampilkan indikator "External" + security badge

### Phase 3 — Core Services
- Registry API menggunakan Storage + Auth dari Phase 3
- AI Module Generator menggunakan AI Engine
- Notifikasi update module via Notification Service
- Pencarian module via Search Service

### Phase 4 — Module Runtime
- ExternalModuleLoader extends ModuleLoader
- iframe Sandbox V2 sebagai alternatif ModuleSandbox V1
- Module bundler menghasilkan format yang kompatibel dengan ModuleLoader
- Security Rating System terintegrasi dengan ModulePermissions

---

## Implementation Roadmap

### Sprint 1 — Foundation (4 hari)

| Day | Deliverable |
|-----|-------------|
| 1   | External Module Loader + manifest validation + integrity check |
| 2   | Module bundler (build, minify, sourcemap, integrity hash) |
| 3   | Module CLI (create, build, dev, validate) |
| 4   | Hot Module Reload (file watcher + WebSocket + dynamic re-import) |

**Gate:** Developer bisa membuat module dengan CLI dan menjalankannya dengan hot reload.

### Sprint 2 — Sandbox V2 (3 hari)

| Day | Deliverable |
|-----|-------------|
| 1   | iframe Sandbox implementation (postMessage bridge, API surface) |
| 2   | Resource limits enforcement (memory, fetch, interval) |
| 3   | Security Rating System + permission analysis |

**Gate:** Module tidak terpercaya bisa jalan di sandbox terisolasi dengan resource limit.

### Sprint 3 — Registry & Marketplace (4 hari)

| Day | Deliverable |
|-----|-------------|
| 1   | Registry API backend (endpoints, database, auth) |
| 2   | Marketplace UI (browse, search, detail, install flow) |
| 3   | Permission dialog + install confirmation flow |
| 4   | Update mechanism + version management |

**Gate:** User bisa mencari, menginstall, dan memperbarui module dari marketplace.

### Sprint 4 — AI & Polish (3 hari)

| Day | Deliverable |
|-----|-------------|
| 1   | AI Module Generator + preview sandbox |
| 2   | Migration tool (Phase 4 → Phase 5 module format) |
| 3   | End-to-end testing, documentation, security audit |

**Gate:** AI bisa generate module dari natural language, dan semua module Phase 4 migrasi lancar.

### Total: ~14 hari

---

## Exit Criteria

Phase 5 selesai apabila:

- External module dapat di-load dari URL remote dengan integrity check
- iframe Sandbox V2 berjalan dengan postMessage bridge yang aman
- Resource limits (memory, fetch, interval) di-enforce
- Module CLI berfungsi (create, build, dev, publish)
- Module Bundler menghasilkan ESM bundle + manifest
- Hot Module Reload berfungsi (watch → build → reload < 500ms)
- Marketplace UI berfungsi (browse, search, install, update, uninstall)
- Registry API minimal berfungsi (daftar module, download, publish)
- AI Module Generator bisa membuat module sederhana dari deskripsi
- Migration tool sukses migrasi semua module Phase 4
- Security Rating System memberikan skor yang akurat
- Semua module Phase 4 tetap kompatibel tanpa perubahan
- Tidak terdapat TypeScript Error
- Build hijau
- Circular dependency 0

---

## Future (Post-Phase 5)

| Fitur | Phase | Notes |
|-------|-------|-------|
| Module Payment System | 6 | Paid modules, revenue sharing |
| Enterprise SSO + Audit | 6 | Untuk deployment organisasi |
| Module Analytics | 6 | Usage tracking untuk developers |
| P2P Module Distribution | 6+ | Decentralized module registry |
| Native Module Bridge | 6+ | WebAssembly + Native API binding |
| Visual Module Builder | 6+ | Drag-and-drop module creator |
