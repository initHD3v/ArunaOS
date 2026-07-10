<div align="center">
  <img src="apps/web/public/logo.png" alt="ArunaOS" width="120" />

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

> An operating environment that runs in the browser — not a macOS replacement, but a layer above that orchestrates applications, windows, and AI into a unified workspace. Tell it what you want done; the system handles the rest.

  <br />
</div>

---

## Overview

ArunaOS is a browser-based operating environment built with Next.js. It features a fully functional window manager, application runtime with IPC, module system, theming engine, power management, and an extensible architecture — all running client-side with zero backend dependencies.

Phase 4 introduces the **Application Runtime & Module System**, transforming ArunaOS from a static desktop environment into a platform that can load, run, and communicate between applications.

---

## Architecture

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

### Module System

The runtime (`packages/runtime`) provides eight services that enable module lifecycle management:

| Service                    | Responsibility                                         |
| -------------------------- | ------------------------------------------------------ |
| **ModuleRegistry**         | Register, query, and track module status               |
| **ModuleLoader**           | Lazy-load modules via factory + dynamic import         |
| **ModuleIPC**              | Request/response, event, and broadcast between modules |
| **ModuleLifecycleManager** | onMount, onUnmount, onSleep, onResume hooks            |
| **ModuleSandbox**          | Proxy-based scope isolation per module                 |
| **ModulePermissions**      | Access control for storage, camera, network, etc.      |
| **ModuleSettings**         | Per-module preferences backed by IndexedDB             |
| **ModuleStore**            | Module-level state management via Zustand              |

Cross-module communication uses a message bus with `request/response`, `event`, and `broadcast` patterns — all routed through the ModuleIPC layer with automatic timeout handling.

---

## Features

### Desktop & Window Manager

- Multi-window desktop with drag, resize, minimize, maximize, snap, and z-order
- Window state persists across sessions via localStorage (Zustand middleware)
- Dock with running app indicators and context menu actions

### Module Runtime

- 7 built-in modules with manifests, factories, and UI components
- All modules openable as managed windows via ModuleWindowService
- Module DevTools panel (`Cmd+Shift+M`) for inspection and lifecycle control
- Module Installer for managing installed modules

### Power Management

- Screensaver with pure CSS animation (zero JavaScript runtime cost)
- Auto-lock and sleep with configurable timeouts (Never — 2 hours)
- Idle detection chain: screensaver → lock → sleep
- Instant wake restoration via EventBus `app:resume`
- Test button in Settings for immediate screensaver preview

### UI & Experience

- OS Tour — 9-slide bilingual (ID/EN) onboarding with animated split layout
- Calendar popup with complete 2026 Indonesian holidays (SKB 3 Menteri)
- Activity Monitor (AStat) — 5-tab real-time system monitor (CPU, Memory, Processes, System, Network)
- Camera app with photo/video capture, timer, and gallery
- Finder file manager with native drag, context menu, clipboard, and blob storage
- Calendar popup with month navigation and clickable event details
- System-wide search via Command Palette
- Auth gate with lock screen and PIN-based security
- Live wallpaper system with gradient presets and custom image upload

### Theming

- 5 themes: light, dark, system, AMOLED, high-contrast
- Full Tailwind CSS dark mode integration
- Consistent design tokens across all components

---

## Project Structure

```
arunaos/
├── apps/
│   └── web/                          # Main Next.js application
│       ├── modules/                   # Built-in module manifests & entry points
│       │   ├── arunaos.files/
│       │   ├── arunaos.settings/
│       │   ├── arunaos.astat/
│       │   ├── arunaos.camera/
│       │   ├── arunaos.ai/
│       │   ├── arunaos.devtools/
│       │   └── arunaos.installer/
│       └── src/
│           ├── features/             # Feature modules
│           ├── hooks/                # Shared React hooks
│           ├── layouts/              # Shell layouts
│           ├── providers/            # Service container & context
│           ├── services/             # Core services
│           └── stores/               # Global state
├── packages/
│   ├── runtime/                      # Module Runtime (8 services, 115 tests)
│   ├── services/                     # Core services (EventBus, Storage, etc.)
│   ├── ui/                           # Shared UI components
│   ├── ai/                           # AI adapter layer
│   ├── auth/                         # Authentication utilities
│   ├── database/                     # Database layer
│   ├── types/                        # Shared TypeScript types
│   └── config/                       # Shared configurations
└── Docs/                             # Documentation & ADR
```

---

## Tech Stack

| Category         | Technology                                                        |
| ---------------- | ----------------------------------------------------------------- |
| Language         | TypeScript (strict mode)                                          |
| Framework        | Next.js 15 (App Router)                                           |
| Styling          | Tailwind CSS v4, shadcn/ui, Motion                                |
| State Management | Zustand with persist middleware                                   |
| Module Runtime   | Custom (8 services, Proxy-based sandbox, EventBus IPC)            |
| Storage          | IndexedDB (settings, files, blobs), localStorage (window persist) |
| Monorepo         | Turborepo + pnpm workspaces                                       |
| Quality          | ESLint, Prettier, Husky, lint-staged, Madge (circular deps)       |

---

## Getting Started

```bash
# Prerequisites: Node.js >= 22, pnpm >= 10

pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Quality Assurance

| Metric                | Status                               |
| --------------------- | ------------------------------------ |
| TypeScript            | 0 errors across 16 packages          |
| Runtime Tests         | 115 tests, 8 test files, all passing |
| Circular Dependencies | 0 (verified via madge)               |
| ESLint                | Clean                                |
| Production Build      | ~55 KB first-load JS                 |

---

## Development Phases

| Phase | Focus                                                                                                                            | Status      |
| ----- | -------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **0** | Product definition, tech stack, standards, UI direction                                                                          | ✅ Complete |
| **1** | Project bootstrap, desktop shell (wallpaper, dock, menu bar)                                                                     | ✅ Complete |
| **2** | Window manager, icon system, file manager, desktop interactions                                                                  | ✅ Complete |
| **3** | Core services (EventBus, Storage, Settings, Theme, Notification, Modal, Search, Shortcut, Command Palette, Workspace, Lifecycle) | ✅ Complete |
| **4** | Application Runtime & Module System (7 built-in modules, IPC, sandbox, lifecycle, permissions, devtools, installer)              | ✅ Complete |
| **5** | External module loader, iframe sandbox V2, hot module reload, marketplace                                                        | 📝 Planned  |

---

## Built With

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Zustand-000000?style=for-the-badge" alt="Zustand" />
  <img src="https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo" alt="Turborepo" />
</p>

---

<p align="center">
  Created by <a href="https://github.com/initHD3v">INITHD3V</a> — 2026
</p>
