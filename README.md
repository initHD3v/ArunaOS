<div align="center">
  <img src="assets/logo.png" alt="ArunaOS" width="120" />

# ArunaOS

**AI-Native Operating Workspace**

  <p align="center">
    <img src="https://img.shields.io/badge/version-0.3.0-8b5cf6?style=flat-square" alt="Version" />
    <img src="https://img.shields.io/badge/status-active-22c55e?style=flat-square" alt="Status" />
    <img src="https://img.shields.io/badge/TypeScript-0_errors-3178c6?style=flat-square" alt="TypeScript" />
    <img src="https://img.shields.io/badge/tests-115_passed-22c55e?style=flat-square" alt="Tests" />
    <img src="https://img.shields.io/badge/circular_deps-0-22c55e?style=flat-square" alt="Circular Dependencies" />
    <img src="https://img.shields.io/badge/license-MIT-f59e0b?style=flat-square" alt="License" />
  </p>

  <br />

  <p><em>Lingkungan operasi berbasis browser yang bukan pengganti OS, melainkan lapisan di atasnya yang mengorkestrasi aplikasi, jendela, dan AI dalam satu workspace terpadu.</em></p>
  <p><em>A browser-based operating environment — not a replacement for your OS, but a layer above that orchestrates applications, windows, and AI into a unified workspace.</em></p>

  <br />
</div>

---

## Ikhtisar / Overview

**Bahasa Indonesia**

ArunaOS adalah lingkungan operasi berbasis browser yang dibangun dengan Next.js. Sistem ini memiliki window manager fungsional, application runtime dengan IPC, modul system, theme engine, power management, dan arsitektur yang dapat dikembangkan — semuanya berjalan di sisi klien tanpa ketergantungan backend.

Phase 4 memperkenalkan **Application Runtime & Module System**, yang mengubah ArunaOS dari lingkungan desktop statis menjadi platform yang dapat memuat, menjalankan, dan mengomunikasikan antar aplikasi.

**English**

ArunaOS is a browser-based operating environment built with Next.js. It features a fully functional window manager, application runtime with IPC, module system, theming engine, power management, and an extensible architecture — all running client-side with zero backend dependencies.

Phase 4 introduces the **Application Runtime & Module System**, transforming ArunaOS from a static desktop environment into a platform that can load, run, and communicate between applications.

---

## Arsitektur / Architecture

```
┌─────────────────────────────────────────────┐
│              Application (Next.js)           │
├─────────────────────────────────────────────┤
│              Desktop Shell                    │
├─────────────────────────────────────────────┤
│              Core Services                    │
│  (EventBus · Storage · Settings · Theme ·    │
│   Notification · Modal · Shortcut · Search · │
│   Workspace · Lifecycle · WindowAdapter)     │
├─────────────────────────────────────────────┤
│           Application Runtime                │
│  (Registry · Loader · IPC · Sandbox ·        │
│   Lifecycle · Permissions · Settings · Store)│
├─────────────────────────────────────────────┤
│         Modules (7 Built-in)                 │
│  Files · Settings · AStat · Camera ·         │
│  AI Chat · DevTools · Module Installer       │
└─────────────────────────────────────────────┘
```

### Module Runtime

Runtime (`packages/runtime`) menyediakan delapan service yang memungkinkan siklus hidup modul berjalan.
_The runtime provides eight services that enable module lifecycle management._

| Service                    | Tanggung Jawab / Responsibility                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **ModuleRegistry**         | Daftar, cari, dan lacak status modul / Register, query, and track module status                                        |
| **ModuleLoader**           | Muat modul secara lazy via factory + dynamic import / Lazy-load modules via factory + dynamic import                   |
| **ModuleIPC**              | Komunikasi request/response, event, dan broadcast antar modul / Request/response, event, and broadcast between modules |
| **ModuleLifecycleManager** | Hook onMount, onUnmount, onSleep, onResume / Lifecycle hook management                                                 |
| **ModuleSandbox**          | Isolasi scope berbasis Proxy per modul / Proxy-based scope isolation per module                                        |
| **ModulePermissions**      | Kontrol akses untuk storage, camera, network, dll. / Access control for storage, camera, network, etc.                 |
| **ModuleSettings**         | Preferensi per modul yang disimpan di IndexedDB / Per-module preferences backed by IndexedDB                           |
| **ModuleStore**            | Manajemen state tingkat modul via Zustand / Module-level state management via Zustand                                  |

Komunikasi antar modul menggunakan message bus dengan pola `request/response`, `event`, dan `broadcast` — semuanya dirutekan melalui ModuleIPC dengan penanganan timeout otomatis.
_Cross-module communication uses a message bus with request/response, event, and broadcast patterns — all routed through the ModuleIPC layer with automatic timeout handling._

---

## Fitur / Features

### Desktop & Window Manager

- Desktop multi-jendela dengan drag, resize, minimize, maximize, snap, dan z-order
- _Multi-window desktop with drag, resize, minimize, maximize, snap, and z-order_
- State jendela bertahan antar sesi via localStorage (Zustand persist middleware)
- _Window state persists across sessions via localStorage (Zustand middleware)_
- Dock dengan indikator aplikasi berjalan dan menu konteks
- _Dock with running app indicators and context menu actions_

### Module Runtime

- 7 modul built-in dengan manifest, factory, dan komponen UI
- _7 built-in modules with manifests, factories, and UI components_
- Semua modul dapat dibuka sebagai window via ModuleWindowService
- _All modules openable as managed windows via ModuleWindowService_
- Panel DevTools (`Cmd+Shift+M`) untuk inspeksi dan kontrol lifecycle
- _DevTools panel for inspection and lifecycle control_
- Module Installer untuk mengelola modul terinstall
- _Module Installer for managing installed modules_

### Power Management

- Screensaver dengan animasi CSS murni (zero biaya JavaScript runtime)
- _Screensaver with pure CSS animation (zero JavaScript runtime cost)_
- Auto-lock dan sleep dengan timeout yang dapat dikonfigurasi (Never — 2 jam)
- _Auto-lock and sleep with configurable timeouts (Never — 2 hours)_
- Rantai deteksi idle: screensaver → lock → sleep
- _Idle detection chain: screensaver → lock → sleep_
- Pemulihan instan via EventBus `app:resume`
- _Instant wake restoration via EventBus `app:resume`_

### UI & Experience

- **OS Tour** — 9 slide bilingual (ID/EN), layout split animasi
- **Calendar Popup** — Lengkap dengan hari libur nasional Indonesia 2026 (SKB 3 Menteri)
- **Activity Monitor (AStat)** — 5 tab monitor sistem real-time (CPU, Memory, Processes, System, Network)
- **Camera App** — Tangkap foto/video dengan timer dan galeri
- **Finder** — File manager dengan drag, menu konteks, clipboard, penyimpanan blob
- **Command Palette** — Pencarian sistem-wide untuk semua modul dan aksi
- **Auth Gate** — Layar kunci dengan keamanan PIN
- **Live Wallpaper** — Gradient preset dan unggah gambar kustom

### Tema / Theming

- 5 tema: light, dark, system, AMOLED, high-contrast
- _5 themes: light, dark, system, AMOLED, high-contrast_
- Integrasi penuh Tailwind CSS dark mode
- _Full Tailwind CSS dark mode integration_
- Design token konsisten di semua komponen
- _Consistent design tokens across all components_

---

## Struktur Proyek / Project Structure

```
arunaos/
├── apps/
│   └── web/                          # Aplikasi utama Next.js
│       ├── modules/                   # Manifest & entry points modul built-in
│       │   ├── arunaos.files/
│       │   ├── arunaos.settings/
│       │   ├── arunaos.astat/
│       │   ├── arunaos.camera/
│       │   ├── arunaos.ai/
│       │   ├── arunaos.devtools/
│       │   └── arunaos.installer/
│       └── src/
│           ├── features/             # Modul fitur
│           ├── hooks/                # React hooks bersama
│           ├── layouts/              # Tata letak shell
│           ├── providers/            # Service container & context
│           ├── services/             # Service inti
│           └── stores/               # State global
├── packages/
│   ├── runtime/                      # Module Runtime (8 service, 115 tests)
│   ├── services/                     # Service inti (EventBus, Storage, dll.)
│   ├── ui/                           # Komponen UI bersama
│   ├── ai/                           # Lapisan adapter AI
│   ├── auth/                         # Utilitas autentikasi
│   ├── database/                     # Lapisan database
│   ├── types/                        # Tipe TypeScript bersama
│   └── config/                       # Konfigurasi bersama
```

---

## Teknologi / Tech Stack

| Kategori / Category | Teknologi / Technology                                            |
| ------------------- | ----------------------------------------------------------------- |
| Bahasa / Language   | TypeScript (strict mode)                                          |
| Framework           | Next.js 15 (App Router)                                           |
| Styling             | Tailwind CSS v4, shadcn/ui, Motion                                |
| State Management    | Zustand dengan persist middleware                                 |
| Module Runtime      | Kustom (8 service, Proxy-based sandbox, EventBus IPC)             |
| Storage             | IndexedDB (settings, files, blobs), localStorage (window persist) |
| Monorepo            | Turborepo + pnpm workspaces                                       |
| Quality             | ESLint, Prettier, Husky, lint-staged, Madge (circular deps)       |

---

## Memulai / Getting Started

```bash
# Prasyarat / Prerequisites: Node.js >= 22, pnpm >= 10

pnpm install
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000) di peramban Anda.
_Open [http://localhost:3000](http://localhost:3000) in your browser._

---

## Jaminan Kualitas / Quality Assurance

| Metrik / Metric       | Status                             |
| --------------------- | ---------------------------------- |
| TypeScript            | 0 error di 16 packages             |
| Runtime Tests         | 115 test, 8 file test, semua lolos |
| Circular Dependencies | 0 (terverifikasi via madge)        |
| ESLint                | Bersih / Clean                     |
| Production Build      | ~55 KB first-load JS               |

---

## Tahap Pengembangan / Development Phases

| Phase | Fokus / Focus                                                                                                                                     | Status                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **0** | Definisi produk, tech stack, standar, arah UI / _Product definition, tech stack, standards, UI direction_                                         | ✅ Selesai / _Complete_     |
| **1** | Bootstrap proyek, desktop shell (wallpaper, dock, menu bar) / _Project bootstrap, desktop shell_                                                  | ✅ Selesai / _Complete_     |
| **2** | Window manager, icon system, file manager, interaksi desktop / _Window manager, icon system, file manager, desktop interactions_                  | ✅ Selesai / _Complete_     |
| **3** | Service inti (EventBus, Storage, Settings, Theme, Notification, Modal, Search, Shortcut, Command Palette, Workspace, Lifecycle) / _Core services_ | ✅ Selesai / _Complete_     |
| **4** | Application Runtime & Module System (7 modul built-in, IPC, sandbox, lifecycle, permissions, devtools, installer)                                 | ✅ Selesai / _Complete_     |
| **5** | External module loader, iframe sandbox V2, hot module reload, marketplace                                                                         | 📝 Direncanakan / _Planned_ |

---

## Teknologi yang Digunakan / Built With

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Zustand-000000?style=for-the-badge" alt="Zustand" />
  <img src="https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo" alt="Turborepo" />
</p>

---

<p align="center">
  Dibuat oleh / Created by <a href="https://github.com/initHD3v">INITHD3V</a> — 2026
</p>
