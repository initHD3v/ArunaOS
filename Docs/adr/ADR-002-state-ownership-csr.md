# ADR-002: State Ownership & Client-Side Rendering Policy

**Status:** Accepted  
**Date:** 2026-07-09  
**Author:** ArunaOS(INITHD3V)  
**Decision Type:** Architecture  

---

## Context

ArunaOS menggunakan:
- **Zustand** — Client state (UI, theme, workspace layout, window positions)
- **TanStack Query** — Server cache (data dari database, file system)
- **WebSocket** — Realtime events (notification, collaboration, sync)
- **Service Worker** — Offline cache & background sync

Tanpa state ownership yang jelas, akan terjadi konflik, race condition, dan data inconsistency.

## Decision

### State Ownership Diagram

```
┌─────────────────────────────────────────────────┐
│                  Zustand (Client)                │
│  ┌───────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ UI State  │ │ Workspace│ │ Session/Cache  │  │
│  │ - theme   │ │ - windows│ │ - preferences  │  │
│  │ - sidebar │ │ - layout │ │ - auth session │  │
│  │ - modals  │ │ - focus  │ │ - draft data   │  │
│  └───────────┘ └──────────┘ └───────────────┘  │
│           ↑           ↑              ↑          │
│           │           │              │          │
│  ┌────────┴───────────┴──────────────┴────────┐ │
│  │           TanStack Query (Server Cache)     │ │
│  │  - File listing       - Settings from DB    │ │
│  │  - Notification list  - AI conversation     │ │
│  │  - Plugin registry    - User data           │ │
│  └─────────────────────────────────────────────┘ │
│           ↑                          ↑           │
│           │                          │           │
│  ┌────────┴────────────┐  ┌──────────┴────────┐ │
│  │  WebSocket (Live)   │  │ Service Worker     │ │
│  │  - Push notif       │  │ (Offline)          │ │
│  │  - Realtime sync    │  │  - Cache first     │ │
│  │  - Collaborative    │  │  - Background sync │ │
│  └─────────────────────┘  └───────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Ownership Rules

1. **Zustand is the single source of truth for ALL client-side state.** TanStack Query results must be mapped into Zustand stores before consumption by components.
2. **TanStack Query only owns server cache.** It never directly mutates UI state. Components read from Zustand, which may internally subscribe to TanStack Query.
3. **WebSocket mutations go through TanStack Query invalidation**, then flow to Zustand via query hooks.
4. **Service Worker is transparent to Zustand.** SW handles offline cache; when online, Zustand reads fresh data via TanStack.
5. **No direct component-to-WebSocket binding.** Components always read from Zustand stores.

### No-SSR Policy

**ArunaOS menggunakan Client-Side Rendering (CSR) secara penuh.**

- `next.config.js`: `output: 'export'` (static SPA) atau konfigurasi CSR murni
- App Router digunakan hanya untuk:
  - File-based routing (clean URL structure)
  - Layout components (shell, desktop)
  - Metadata & SEO dasar
- Semua konten di-render di client (`'use client'`)
- Server Components hanya digunakan untuk layout statis yang tidak pernah berubah
- SSR dilarang karena:
  1. Menambah TTI (Time To Interactive) secara signifikan
  2. Bertentangan dengan target cold startup < 2 detik
  3. Tidak diperlukan untuk workspace environment (tidak ada indexable content publik)
  4. WebSocket + Zustand tidak bisa dihydrate dengan benar via SSR

## Consequences

- **Positive:** State flow jelas, debugging mudah, race condition terminimalkan
- **Positive:** CSR murni = startup cepat, bundle predictable
- **Negative:** Tidak SEO-friendly — tapi tidak relevan untuk ArunaOS
- **Negative:** Harus maintain middleware pattern untuk Zustand ↔ TanStack Query

## References

- Phase0.md §9 Performance Goals
- Phase0.md §20 Coding Convention (Server Components Only vs Client)