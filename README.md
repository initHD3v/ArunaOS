# ArunaOS

**AI-Native Operating Workspace** — Bekerja dengan niat (Intent), bukan aplikasi.

ArunaOS adalah Operating Environment yang berjalan di browser modern (khususnya Safari di macOS Apple Silicon) dengan AI sebagai pusat interaksi.

## Tech Stack

| Kategori | Pilihan |
|----------|---------|
| Language | TypeScript |
| Framework | Next.js (App Router) |
| Styling | Tailwind CSS, shadcn/ui, Motion |
| State | Zustand |
| Data | TanStack Query |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| Cache | Redis |
| Queue | BullMQ |
| Auth | Better Auth |
| AI | Provider-agnostic (OpenAI, Ollama, Anthropic, dll) |
| Monorepo | Turborepo + pnpm |

## Repo Structure

```
arunaos/
├── apps/
│   ├── web/          # Main application
│   ├── docs/         # Documentation
│   └── playground/   # Playground
├── packages/         # Shared packages
├── infrastructure/   # Docker, DB, Redis, scripts
└── docs/             # Project documentation
```

## Getting Started

```bash
pnpm install
pnpm dev
```

## Phase 0 — Foundation

Phase 0 mencakup Product Definition, Technical Stack Finalization, Repository Structure, Development Standard, Architecture Draft, UI Direction, Performance Budget, Coding Convention, dan Development Workflow. Tidak ada implementasi kode pada phase ini.

## License

Proprietary — © 2026 ArunaOS (INITHD3V)