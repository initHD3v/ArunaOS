Phase1.md

ArunaOS

Phase 1 — Project Bootstrap & Foundation

Version: 0.1.0
Status: Approved
Depends On: Phase0.md

⸻

Objective

Membangun pondasi teknis ArunaOS sehingga seluruh tim memiliki environment yang identik, project dapat dijalankan hanya dengan beberapa perintah, dan shell pertama ArunaOS dapat ditampilkan dengan performa optimal.

Phase ini tidak mengimplementasikan business logic, AI, database query, ataupun module. Fokus utama adalah membangun pondasi yang stabil, scalable, dan maintainable.

⸻

Success Criteria

Semua poin berikut harus terpenuhi.

* Monorepo berhasil dibuat menggunakan Turborepo.
* Project dapat dijalankan menggunakan satu command.
* TypeScript berjalan tanpa error.
* TailwindCSS berhasil dikonfigurasi.
* shadcn/ui berhasil dikonfigurasi.
* Dark Mode berjalan.
* Light Mode berjalan.
* Design Token berhasil diterapkan.
* Desktop Shell berhasil ditampilkan.
* Dock berhasil tampil.
* Menu Bar berhasil tampil.
* Wallpaper berhasil tampil.
* Startup < 2 detik.
* Tidak ada hydration error.
* Lighthouse Performance ≥ 95.
* Lighthouse Accessibility ≥ 95.
* Lighthouse Best Practice ≥ 95.

⸻

Deliverables

* Monorepo
* Next.js Application
* Shared Packages
* Design System Foundation
* Application Shell
* Global Layout
* Theme Engine
* Font System
* Icon System
* Startup Engine
* Development Environment

⸻

Technology Lock

Monorepo

* Turborepo

⸻

Package Manager

* pnpm

⸻

Frontend

* Next.js (App Router)
* React
* TypeScript

⸻

Styling

* TailwindCSS
* shadcn/ui
* Motion

⸻

State

* Zustand

⸻

Query

* TanStack Query

⸻

Theme

* next-themes

⸻

Icons

* Lucide

⸻

Fonts

* Geist Sans
* Geist Mono

⸻

Utilities

* clsx
* class-variance-authority
* tailwind-merge

⸻

Quality

* ESLint
* Prettier
* Husky
* lint-staged

⸻

Testing

* Vitest
* Playwright

⸻

Repository Structure

arunaos/
apps/
    web/
    docs/
    playground/
packages/
    ui/
    config/
    auth/
    database/
    ai/
    hooks/
    utils/
    types/
    constants/
    icons/
    animations/
    shared/
docs/
.github/
package.json
pnpm-workspace.yaml
turbo.json

⸻

apps/web Structure

src/
app/
components/
features/
layouts/
providers/
hooks/
stores/
styles/
lib/
config/
constants/
workers/
assets/
types/
middleware/

⸻

Global Application Layout

<App>
    ThemeProvider
        QueryProvider
            AuthProvider
                WorkspaceProvider
                    DesktopShell
                        Wallpaper
                        MenuBar
                        Desktop
                        Dock
                        Overlay
                        Portal

⸻

Desktop Shell

DesktopShell merupakan root UI ArunaOS.

DesktopShell bertanggung jawab terhadap

* Fullscreen Layout
* Wallpaper
* Dock
* Menu Bar
* Notification Layer
* Overlay Layer
* Toast Layer
* Portal Root
* Window Root

DesktopShell tidak boleh memiliki business logic.

⸻

UI Composition

DesktopShell
├── Wallpaper
├── MenuBar
├── Desktop
├── Dock
├── NotificationLayer
├── OverlayLayer
├── ModalRoot
├── WindowRoot
└── PortalRoot

⸻

Initial Screen

Saat aplikasi pertama kali dijalankan.

Desktop harus menampilkan

* Wallpaper
* Dock
* Menu Bar

Tanpa icon.

Tanpa AI.

Tanpa Window.

Tanpa Login.

Tanpa Module.

⸻

Wallpaper

Requirement

* GPU Accelerated
* Responsive
* Cover
* Blur Support
* Gradient Overlay
* Lazy Loaded

Future

* Video Wallpaper
* Dynamic Wallpaper
* AI Wallpaper

⸻

Menu Bar

Position

Top

Height

32px

Content

Left

* ArunaOS Logo

Center

* Empty

Right

* Clock
* Network
* Battery
* Theme Toggle

Future

* User
* Notification
* AI Status

⸻

Dock

Position

Bottom Center

Requirements

* Floating
* Rounded
* Glass Effect
* Blur
* Hover Animation
* Spring Animation
* Auto Hide (Future)

Initial Icons

* Finder
* AI
* Files
* Settings

Semua icon bersifat placeholder.

Belum memiliki action.

⸻

Theme Engine

Support

* Light
* Dark
* System

Theme harus berjalan tanpa reload.

Theme menggunakan CSS Variables.

Tidak diperbolehkan menggunakan hardcoded color.

⸻

Color System

Semua warna menggunakan Design Token.

Contoh

--background
--foreground
--card
--primary
--secondary
--accent
--border
--muted
--ring
--success
--warning
--danger

Tidak diperbolehkan menggunakan

#ffffff
#000000

langsung pada component.

⸻

Typography

Primary

Geist Sans

Mono

Geist Mono

Weight

300

400

500

600

700

⸻

Radius System

xs
sm
md
lg
xl
2xl
full

⸻

Spacing System

Menggunakan

8 Point Grid

4
8
12
16
24
32
40
48
64
80
96

⸻

Shadow System

shadow-xs
shadow-sm
shadow-md
shadow-lg
shadow-xl

Tidak diperbolehkan membuat shadow custom.

⸻

Animation System

Motion Library

Spring Based

Default Duration

250ms

Hover

120ms

Page Transition

250ms

Dock Animation

Spring

Window Animation

Spring

No CSS Keyframe Animation kecuali benar-benar diperlukan.

⸻

Folder Rules

Component

Button/
Button.tsx
Button.test.tsx
Button.stories.tsx
index.ts

Feature

desktop/
components/
hooks/
stores/
types/
utils/
constants/

⸻

Component Rules

Setiap component harus

* Typed
* Reusable
* Stateless jika memungkinkan
* Accessible
* Memoized bila diperlukan

⸻

Naming Convention

Component

PascalCase

Hook

camelCase

Constant

UPPER_CASE

Type

PascalCase

Folder

kebab-case

⸻

Providers

Application wajib memiliki provider berikut

* ThemeProvider
* QueryProvider
* WorkspaceProvider

Future

* AIProvider
* AuthProvider
* NotificationProvider

⸻

Zustand Store

Belum membuat business state.

Hanya

* Theme
* UI
* Desktop

⸻

Environment Variables

Support

NODE_ENV
NEXT_PUBLIC_APP_NAME
NEXT_PUBLIC_APP_VERSION
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_AI_PROVIDER

Belum ada secret key.

⸻

Error Boundary

Application wajib memiliki

Global Error Boundary

Fallback UI

Development Error Overlay

⸻

Loading Strategy

Splash Screen maksimal

1 detik

Setelah itu langsung Desktop.

Tidak diperbolehkan blank screen.

⸻

Startup Flow

Browser
↓
Load HTML
↓
Load CSS
↓
Hydration
↓
Theme
↓
DesktopShell
↓
Wallpaper
↓
MenuBar
↓
Dock
↓
Ready

⸻

Accessibility

Keyboard Navigation

Focus Ring

ARIA Label

Color Contrast AA

Reduced Motion Support

⸻

Performance Budget

Startup

<2 Second

Hydration

<300ms

Bundle

<300KB gzip

FPS

60

Memory

<300MB

Layout Shift

0

⸻

Browser Support

Primary

Safari

Secondary

Chrome


⸻

Coding Standards

No any

No JavaScript

Strict TypeScript

ESLint Zero Warning

Prettier Required

No Dead Code

No Console.log pada Production

⸻

Git Workflow

Branch

main
develop
feature/*
fix/*
release/*

Commit

Conventional Commit

Contoh

feat:
fix:
refactor:
style:
test:
docs:
perf:
build:
ci:
chore:

⸻

Testing Requirements

Semua component UI wajib memiliki

* Render Test
* Accessibility Test

DesktopShell wajib memiliki

* Startup Test
* Theme Test
* Responsive Test

⸻

Exit Criteria

Phase 1 selesai apabila

* Seluruh dependency berhasil dikonfigurasi.
* Turborepo berjalan normal.
* pnpm workspace berjalan.
* Next.js berhasil dijalankan.
* TailwindCSS aktif.
* shadcn/ui aktif.
* Theme Engine aktif.
* DesktopShell berhasil dirender.
* Wallpaper berhasil dirender.
* Menu Bar berhasil dirender.
* Dock berhasil dirender.
* Lighthouse memenuhi target.
* Tidak terdapat TypeScript Error.
* Tidak terdapat ESLint Warning.
* Tidak terdapat Hydration Error.
* Project siap memasuki Phase 2.

⸻

Deliverable Preview

┌────────────────────────────────────────────────────────────┐
                    Menu Bar
──────────────────────────────────────────────────────────────
                       Wallpaper
                         Desktop
──────────────────────────────────────────────────────────────
                     Floating Dock
──────────────────────────────────────────────────────────────

Tidak ada interaksi selain render.

Tidak ada AI.

Tidak ada Window.

Tidak ada Authentication.

Tidak ada Database.

Tidak ada Module.

Fokus utama Phase 1 adalah menghasilkan ArunaOS Shell yang ringan, konsisten, siap dikembangkan, dan menjadi fondasi seluruh fase berikutnya.