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

## Session 2 (30 Jul 2026) — Web search, status streaming, ChatFallback with tools, health indicator

### Summary

Added web search (Wikipedia + DuckDuckGo) for local models, status chunk streaming (`thinking`/`searching`/`done`/`fail`), ChatFallback with full tool execution, 3-state health indicator, and web search toggle.

### Files created/modified

| File                                                             | Change                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ai/src/tools/web-search.ts`                            | **New** — `WebSearchCache` (Map, 30min TTL), `WebSearchRateLimiter` (2s interval, 10/min), `shouldSearchWeb()` heuristic (skip greetings/<5 chars), `searchWikipedia()` (id.wikipedia.org REST API), `searchDuckDuckGo()` (api.duckduckgo.com), `webSearch()` main entry                           |
| `packages/ai/src/chat-fallback.ts`                               | **Rewritten** — now `async`, accepts `AITool[]` → creates internal `ToolRegistry` + `ToolRouter` + `ToolResultFormatter`; tries tools → knowledge base (presiden, ibukota) → patterns → default; `respondStream()` yields `{type:'status', status:'thinking'\|'searching'\|'done'\|'fail'}` chunks |
| `packages/ai/src/types.ts`                                       | Added `'status'` to `AIStreamChunk.type` + `status?: 'thinking'\|'searching'\|'done'\|'fail'`; added `webSearchEnabled?: boolean` to `AICompletionRequest`                                                                                                                                         |
| `packages/ai/src/ai-service.ts`                                  | `completeStream()` yields `{type:'status', status:'thinking'}` at start; adds web search phase after fallback context when `req.webSearchEnabled !== false && shouldSearchWeb(query)` → searches, injects result as user message, re-submits; same flow in `complete()`                            |
| `packages/ai/src/chat-session.ts`                                | `sendMessageStream(content, options?)` accepts `options.webSearchEnabled` → passes to completion request                                                                                                                                                                                           |
| `apps/web/src/app/api/ai/chat/route.ts`                          | `fallback = new ChatFallback(getDefaultTools())`; `fallback.respond()` is `await`-ed; reads `webSearch` query param → passes to `sendMessageStream`                                                                                                                                                |
| `apps/web/src/app/api/ai/health/route.ts`                        | **New** — `GET /api/ai/health` returns `{status: 'full'\|'none', providerCount, providers: [{type, model}]}`                                                                                                                                                                                       |
| `apps/web/src/features/ai/ai-chat.tsx`                           | SSE handler reads `localStorage('ai-web-search')` → `webSearch` param; handles `type:'status'` chunks (pushes with `role:'status'`, auto-hides after 1.5s); periodic health check (30s) + online/offline listeners → `aiHealth` state; banner shows red (no provider) or amber (offline)           |
| `apps/web/src/features/ai/ai-status.tsx`                         | **Rewritten** — 3-state dot: green `full` (provider + online), yellow `limited` (provider + offline), red `none` (no provider); uses `/api/ai/health`; `Sparkles`/`WifiOff`/`AlertCircle` icons                                                                                                    |
| `apps/web/src/features/ai/components/chat-messages.tsx`          | Added `'status'` to `ChatMessage.role`; `StatusBubble` rendering — animated ping circle + animated dots for "Thinking...", animated ping for "Searching web..."                                                                                                                                    |
| `apps/web/src/features/ai/components/chat-input.tsx`             | Dynamic placeholder: "Ask AI..." (green), "🌐 Offline — answers limited" (amber/yellow), "🔌 Setup AI in Settings" (red) via `aiHealth` prop                                                                                                                                                       |
| `apps/web/src/features/ai/components/ai-chat-settings-panel.tsx` | Added "Pencarian Web" toggle row (bottom of content area) — `Globe` icon, toggle button, saves to `localStorage('ai-web-search')`                                                                                                                                                                  |
| `apps/web/src/features/settings/components/ai-settings.tsx`      | Added web search toggle section (before save button) — description + toggle button, saves to `localStorage('ai-web-search')`                                                                                                                                                                       |

### Architecture

- **Web search** runs after router + fallback context miss, only for local models. Skipped if `req.webSearchEnabled === false` or `shouldSearchWeb()` returns false (greetings, short queries).
- **Status streaming**: `completeStream()` yields `{type:'status', status:'thinking'}` → routes/falls back → yields `{type:'status', status:'searching'}` during web search → provider stream → `{type:'status', status:'done'}`. Client pushes status as `role:'status'` message with `status-` id prefix, auto-removes after 1.5s.
- **Health**: 3-state via `/api/ai/health` + `navigator.onLine`. Health endpoint checks `AIService.getAvailableProviders()`. Client polls every 30s and listens to `online`/`offline` events.
- **Web search toggle**: persisted in `localStorage('ai-web-search')` (default `true`), passed as `webSearch` query param to `/api/ai/chat` GET.
