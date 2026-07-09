# ArunaOS

**AI-Native Operating Workspace** — kerja pakai niat, bukan buka aplikasi satu-satu.

ArunaOS itu operating environment yang jalan di browser. Bukan pengganti macOS, tapi semacam "lapisan" di atasnya yang bikin kamu bisa interaksi pake AI sebagai pusatnya. Mau buka file, nyari data, resize window, atau ngerjain tugas kompleks — cukup bilang apa yang mau dicapai, AI yang urus sisanya.

---

## Milestone

| Phase | Fokus | Status |
|-------|-------|--------|
| **Phase 0** | Product Definition, Tech Stack Finalization, Repository Structure, Development Standard, UI Direction, Performance Budget | ✅ Selesai |
| **Phase 1** | Bootstrap project (Next.js, Tailwind, shadcn/ui, Drizzle, Redis) + Tampilin ArunaOS Shell pertama (Desktop kosong + Wallpaper + Dock + Menu Bar) | ⏳ Selanjutnya |
| **Phase 2** | Window Manager, Dock interactions, Menu Bar functionality | 📝 Rencana |
| **Phase 3** | AI Engine integration, Command Palette, Intent Parser | 📝 Rencana |
| **Phase 4** | File Explorer, Search, Notification Center | 📝 Rencana |
| **Phase 5** | Settings, Theme Engine, Plugin System, Voice Assistant | 📝 Rencana |

---

## Tech Stack

| | |
|---|---|
| Bahasa | TypeScript |
| Framework | Next.js (App Router) |
| Styling | Tailwind CSS, shadcn/ui, Motion |
| State | Zustand |
| Data | TanStack Query |
| Database | PostgreSQL + Drizzle ORM |
| Cache / Queue | Redis + BullMQ |
| Auth | Better Auth |
| AI | Provider Flexible (OpenAI, Ollama, Anthropic, Gemini, OpenRouter) |
| Monorepo | Turborepo + pnpm |

---

## Repo Structure

```
arunaos/
├── apps/
│   ├── web/          # Aplikasi utama
│   ├── docs/         # Dokumentasi
│   └── playground/   # Buat eksperimen
├── packages/          # Shared packages (ui, ai, database, dll)
├── infrastructure/    # Docker, Postgres, Redis, scripts
└── Docs/              # Dokumentasi project & ADR
```

---

## Mulai

```bash
pnpm install
pnpm dev
```

Pastikan udah pake Node.js ≥ 22 dan pnpm ≥ 10.

---

Dibikin sama [INITHD3V](https://github.com/initHD3v) — 2026.