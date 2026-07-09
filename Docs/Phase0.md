# Phase0.md

# ArunaOS
### Phase 0 Foundation & Product Definition

**Version:** 0.1.0  
**Status:** Approved  
**Author:** ArunaOS(INITHD3V)  
**Last Updated:** July 2026

---

# 1. Executive Summary

ArunaOS adalah AI-Native Operating Workspace yang berjalan melalui browser modern dengan fokus utama pada Safari di macOS (Apple Silicon).

ArunaOS **bukan** sistem operasi pengganti macOS.

ArunaOS adalah Operating Environment yang menyediakan pengalaman seperti sistem operasi di dalam browser dengan AI sebagai pusat interaksi.

Seluruh desain sistem dibangun berdasarkan prinsip bahwa pengguna tidak lagi membuka aplikasi satu per satu, tetapi menyampaikan tujuan (Intent), kemudian AI akan menentukan langkah terbaik untuk menyelesaikannya.

---

# 2. Vision

 Build an AI-native workspace where users interact with intentions instead of applications.

---

# 3. Mission

Membangun workspace berbasis AI yang:

- Cepat
- Efisien
- Minimalis
- Natural
- Modular
- Aman
- Mudah dikembangkan
- Optimized untuk Apple Silicon

---

# 4. Core Philosophy

- AI First
- Human Centered
- Performance First
- Minimal Interaction
- Invisible Complexity
- Native Feeling
- Consistency Over Creativity
- Calm Computing

---

# 5. Project Scope

Phase 0 hanya mencakup:

- Product Definition
- Technical Definition
- Project Foundation
- Architecture Planning
- Development Standard
- Repository Structure
- Coding Convention
- Tech Stack Definition

Phase 0 **tidak mencakup** implementasi kode.

---

# 6. Product Scope

ArunaOS akan memiliki:

- Desktop Environment
- Window Manager
- Dock
- Menu Bar
- Notification Center
- Command Palette
- AI Workspace
- Settings
- File Explorer
- Search
- Plugin System
- Module System
- AI Engine
- Voice Assistant
- Authentication
- Workspace Management
- Theme Engine
- Automation Engine
- Background Task Engine
- Notification Engine

---

# 7. Target Platform

Primary

- Safari (macOS)

Secondary

- Chrome


Future

- iPadOS

---

# 8. Browser Requirement

- WebAssembly
- Web Worker
- Service Worker
- IndexedDB
- WebSocket
- WebRTC
- CSS Container Query
- CSS View Transition API (jika tersedia)
- File System Access API (opsional)
- WebGPU (future)
- Web Speech API
- MediaDevices API

---

# 9. Performance Goals

Cold Startup

< 2 Seconds

Navigation

< 100ms

Animation

60 FPS (up to 120 FPS)

Memory Usage

< 500 MB

Initial Bundle

< 300 KB (gzip)

Time To Interactive

< 2 Seconds

Lazy Loaded Modules

100%

Zero Full Reload

Target: Always

---

# 10. UI Philosophy

Design Language

Inspired by

- macOS
- One UI
- Linear
- Raycast
- Arc Browser
- Notion

Design Principles

- Minimal
- Calm
- Spacious
- Rounded
- Smooth
- Glass
- Elegant
- Accessible

---

# 11. Design Tokens

Typography

- Inter
- Geist

Radius

- 12px
- 16px
- 24px

Animation

Spring Based

Spacing

8pt Grid

Shadow

Soft

Blur

Heavy Glass

---

# 12. Technical Stack

## Language

- TypeScript

---

## Runtime

- Node.js LTS

---

## Frontend

- Next.js
- React
- App Router

---

## Styling

- TailwindCSS
- shadcn/ui
- Motion

---

## State Management

- Zustand

---

## Data Fetching

- TanStack Query

---

## Forms

- React Hook Form
- Zod

---

## Icons

- Lucide Icons

---

## Database

- PostgreSQL

---

## ORM

- Drizzle ORM

---

## Cache

- Redis

---

## Queue

- BullMQ

---

## Storage

- S3 Compatible Object Storage

---

## Authentication

- Better Auth

---

## AI

Provider Architecture

Supported

- OpenAI
- Ollama
- LM Studio
- Anthropic
- Google Gemini
- OpenRouter

---

## Realtime

- WebSocket

---

## Deployment

- Docker
- Docker Compose

Future

- Kubernetes

---

## Package Manager

- pnpm

---

## Monorepo

- Turborepo

---

## Testing

- Vitest
- Playwright

---

## Lint

- ESLint

---

## Formatter

- Prettier

---

## Git Hook

- Husky
- lint-staged

---

## Documentation

- Markdown

Future

- Storybook

---

# 13. Repository Structure

```text
arunaos/

├── apps/
│   ├── web/
│   ├── docs/
│   └── playground/
│
├── packages/
│   ├── ui/
│   ├── config/
│   ├── types/
│   ├── utils/
│   ├── ai/
│   ├── database/
│   ├── auth/
│   ├── hooks/
│   ├── icons/
│   ├── constants/
│   ├── services/
│   ├── shared/
│   └── animations/
│
├── infrastructure/
│   ├── docker/
│   ├── postgres/
│   ├── redis/
│   └── scripts/
│
├── docs/
│
├── .github/
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

# 14. apps/web Structure

```text
apps/web/

src/

├── app/
├── components/
├── features/
├── layouts/
├── providers/
├── services/
├── hooks/
├── stores/
├── styles/
├── lib/
├── config/
├── types/
├── assets/
├── workers/
├── constants/
└── middleware/
```

---

# 15. Feature Structure

```text
features/

desktop/

dock/

window-manager/

notification/

settings/

search/

command/

workspace/

ai/

files/

theme/

wallpaper/

voice/
```

---

# 16. Window Architecture

Desktop

↓

Workspace

↓

Window Layer

↓

Floating Window

↓

Application

↓

Component

---

# 17. Module Architecture

Workspace

↓

Module

↓

Page

↓

Widget

↓

Component

---

# 18. AI Architecture

User

↓

Intent

↓

Intent Parser

↓

Context Engine

↓

AI Provider

↓

Action Engine

↓

Workspace

---

# 19. Development Principles

- Everything must be typed.
- No JavaScript.
- TypeScript only.
- Component-first architecture.
- Feature-first organization.
- Reusable before duplicated.
- Accessibility by default.
- Mobile responsive.
- Desktop optimized.
- Lazy load everything possible.
- No unnecessary dependencies.
- Every feature must be documented.
- Every component must have a single responsibility.

---

# 20. Coding Convention

- Functional Components Only
- Server Components First
- Client Components Only When Needed
- Composition Over Inheritance
- Atomic Commit
- Conventional Commit
- Feature Branch Workflow

---

# 21. Git Branch Strategy

```text
main

develop

feature/*

fix/*

hotfix/*

release/*
```

---

# 22. Definition of Done

Sebuah pekerjaan dianggap selesai apabila:

- Build berhasil tanpa error.
- Lint tanpa warning.
- TypeScript tanpa error.
- Test lulus.
- Dokumentasi diperbarui.
- Tidak menurunkan performa.
- Tidak menambah technical debt yang tidak terdokumentasi.
- Code review disetujui.

---

# 23. Milestone Phase 0 Deliverables

- Product Definition
- Technical Stack Finalization
- Repository Structure
- Development Standard
- Architecture Draft
- UI Direction
- Performance Budget
- Coding Convention
- Folder Structure
- Development Workflow

---

# 24. Exit Criteria

Phase 0 dinyatakan selesai apabila:

- Seluruh keputusan teknis telah disetujui.
- Struktur proyek telah ditetapkan.
- Stack teknologi telah dikunci.
- Standar pengembangan telah ditetapkan.
- Repository siap untuk inisialisasi.
- Tidak ada perubahan mayor pada arsitektur inti tanpa melalui proses ADR (Architecture Decision Record).

---

# 25. Next Phase

**Phase 1 — Project Bootstrap & Development Environment**

Deliverables:

- Inisialisasi Turborepo.
- Konfigurasi `pnpm`.
- Setup Next.js.
- Konfigurasi TypeScript.
- Integrasi Tailwind CSS.
- Instalasi shadcn/ui.
- Konfigurasi ESLint, Prettier, Husky, dan lint-staged.
- Setup Drizzle ORM, PostgreSQL, dan Redis.
- Implementasi Design Tokens.
- Menampilkan ArunaOS Shell pertama (Desktop kosong + Wallpaper + Dock + Menu Bar) dengan target startup < 2 detik.