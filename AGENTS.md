# ArunaOS — Panduan Agent

## Memulai

```bash
pnpm install        # install (Node >=22, pnpm >=10)
pnpm dev            # turbo dev → next dev di localhost:3000
pnpm build          # turbo build
pnpm lint           # turbo lint
pnpm typecheck      # turbo typecheck (bergantung ^build)
pnpm test           # turbo test (bergantung ^build)
pnpm circular       # madge cek circular dependency
pnpm format         # prettier --write seluruh file
```

## Struktur Monorepo

`pnpm-workspace.yaml` — packages: `apps/*`, `packages/*`, `packages/runtime/hot-reload`

| Path                       | Package             | Peran                                                       |
| -------------------------- | ------------------- | ----------------------------------------------------------- |
| `apps/web/`                | `@arunaos/web`      | Next.js 15 App Router — shell OS                            |
| `packages/runtime/`        | `@arunaos/runtime`  | Module Runtime (8 service) — 115 test                       |
| `packages/services/`       | `@arunaos/services` | Service inti (EventBus, Storage, Theme, dll.)               |
| `packages/engine/`         | `@arunaos/engine`   | ArunaEngine — abstraksi engine AI                           |
| `packages/ai/`             | `@arunaos/ai`       | Adapter provider AI (OpenAI, Anthropic, Ollama, OpenRouter) |
| `packages/ui/`             | `@arunaos/ui`       | Komponen UI bersama (shadcn/ui)                             |
| `packages/types/`          | `@arunaos/types`    | Tipe TypeScript bersama                                     |
| `packages/config/`         | `@arunaos/config`   | `tsconfig.base.json` — semua package extend ini             |
| `packages/module-bundler/` | —                   | Bundler esbuild untuk module eksternal                      |
| `packages/module-cli/`     | —                   | CLI untuk development module                                |

## Path alias

- `@/` → `apps/web/src/`
- `@modules/` → `apps/web/modules/`
- `@arunaos/*/` → `packages/*/src/`

## Wiring arsitektur

File paling penting: `apps/web/src/providers/service-provider.tsx`. File ini:

- Inisialisasi semua core service + module runtime service di `ServiceContainer`
- Mendefinisikan **semua manifest module built-in inline** (10 module: files, settings, astat, camera, ai, devtools, installer, appstore, weather, applications)
- Mendaftarkan **semua factory module** via `moduleLoader.registerFactory()` dengan dynamic import dari `@modules/arunaos.*/api`
- Mendaftarkan shortcut, search index, dan `SystemAPI` untuk module sandbox
- Urutan wrapper: `ServiceProvider > ArunaEngineProvider > QueryProvider > WorkspaceProvider`

## Testing

Framework: **Vitest** (bukan Jest). Setiap package punya `vitest.config.ts` sendiri.

| Config                              | Environment | Lokasi test                  |
| ----------------------------------- | ----------- | ---------------------------- |
| `apps/web/vitest.config.ts`         | `jsdom`     | `src/**/*.test.{ts,tsx}`     |
| `packages/runtime/vitest.config.ts` | `node`      | `src/__tests__/**/*.test.ts` |

Setup: `apps/web/src/test/setup.ts` — import `@testing-library/jest-dom`, mock `localStorage`.

Jalankan satu package: `pnpm --filter @arunaos/runtime test`
Jalankan satu file test: `pnpm --filter @arunaos/runtime exec vitest run src/__tests__/ipc.test.ts`
Batas coverage: statements 80%, branches 65-70%.

## Konvensi penting

- **TypeScript**: `strict: true`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`
- **ESLint**: `@typescript-eslint/no-unused-vars` sebagai warn (argumen `_` diabaikan), `no-console` sebagai warn (izinkan warn/error)
- **Prettier**: semi, singleQuote, trailingComma all, printWidth 100, prettier-plugin-tailwindcss
- **Husky + lint-staged**: `eslint --fix` + `prettier --write` untuk `*.{ts,tsx,js,jsx}`; `prettier --write` untuk `*.{json,md,yaml}`
- **State management**: Zustand dengan persist middleware (localStorage)
- **Storage**: IndexedDB untuk settings/files/blobs; localStorage untuk window state
- **Tailwind CSS v4**: via plugin `@tailwindcss/postcss`
- **Urutan CI**: `lint → typecheck → test → circular`

## Environment

Salin `.env.example` ke `env/.env` atau `.env.local`. Prioritas provider AI: `openai > openrouter > anthropic > ollama`. Docker compose di `infrastructure/docker/docker-compose.yml` untuk Postgres + Redis (dibutuhkan untuk registry API dan auth, **tidak** untuk fitur desktop inti).

## Hal yang tidak obvious

- Manifest module dan registrasi factory **tidak** di file terpisah — semuanya inline di `service-provider.tsx`.
- `turbo typecheck` dan `turbo test` bergantung pada `^build` — dependency harus dibuild dulu.
- Sandbox module built-in menggunakan Proxy (bukan iframe).
- Module berkomunikasi via `ModuleIPC` di atas `EventBus` dengan pola request/response, event, dan broadcast.
- File `.wasm` di lockfile (`@img/sharp-wasm32`, dll.) adalah dependensi transitive dari build tools — **tidak** digunakan di kode proyek.
