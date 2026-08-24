# PRD — Bugfix, Security Hardening & Performance (prdbugfix.md)

**Proyek:** ArunaOS
**Tanggal:** 24 Agustus 2026
**Status:** In Progress
**Sumber:** Investigasi mendalam 4 area — runtime/services, web features, security, performance

Aturan pengerjaan: setiap item dikerjakan satu per satu → verifikasi (typecheck/lint) + testing (vitest) → dicentang ✅ hanya jika benar-benar lolos.

---

## Fase 1 — Security Hardening

### S1. Sandbox iframe escape (CRITICAL)

- **Lokasi:** `packages/runtime/src/sandbox-v2.ts:56-58`
- **Masalah:** `allow-scripts` + `allow-same-origin` pada iframe `srcdoc` memungkinkan modul jahat melepas atribut sandbox dirinya dan mengakses DOM parent + localStorage (termasuk API keys).
- **Fix:** Hapus `allow-same-origin`; serve bridge via Blob URL (origin opaque). Modul tetap bisa `postMessage` ke parent.
- [x] Selesai & terverifikasi

### S2. targetOrigin pinning

- **Lokasi:** semua `postMessage(..., '*')` di `sandbox-v2.ts`
- **Fix:** Ganti dengan origin spesifik iframe; untuk host→frame gunakan `iframe.contentWindow.postMessage(msg, '*')` hanya jika frame opaque (blob) — dokumentasikan; untuk frame→host, validasi `event.origin`.
- [x] Selesai & terverifikasi — child→parent pin via PARENT_ORIGIN injected; host validasi event.origin==='null'; blob URL revoked di unmount; 4 test baru hijau

### S3. Auth pada `/api/ai/settings` GET + fail-closed publish route

- **Lokasi:** `apps/web/src/app/api/ai/settings/route.ts`, `apps/web/src/app/api/modules/publish/route.ts:6`
- **Masalah:** GET mengembalikan API key tanpa auth apa pun jika tahu sessionId; publish route lolos auth dengan header `Bearer undefined` saat env var tidak diset.
- **Fix:** (a) GET tidak lagi mengembalikan apiKey penuh — mask/redact; (b) publish gagal tertutup (503) saat `REGISTRY_API_KEY` unset.
- [x] Selesai & terverifikasi — GET redact + hasApiKey; client merge non-destruktif; publish 503 tanpa env; typecheck/lint/142 test hijau

### S4. Verifikasi signature manifest + escape `</script>`

- **Lokasi:** `external-loader.ts:137` (field `signature` diterima tapi tak diverifikasi), `sandbox-v2.ts:101-119`
- **Fix:** (a) Implement TOFU: simpan checksum pertama kali install sebagai anchor; update wajib mencocokkan signature Ed25519 bila ada, atau konfirmasi user. (b) Escape `</script` di bundle embedding.
- [x] Selesai & terverifikasi — anchor TOFU + verifyModuleSignature Ed25519 + opsi allowUnverifiedUpdate; escape </script selesai di S1; update() fetch-before-uninstall dengan rollback (B7 ikut); 5 test baru hijau

---

## Fase 2 — Bug High

### B1. lifecyclePending leak + callLifecycle tanpa timeout

- **Lokasi:** `sandbox-v2.ts:69-82, 131-141`
- **Fix:** reject+clear `lifecyclePending` di `unmount()`; tambah timeout `maxExecutionMs` di `callLifecycle()` dengan clearTimeout; guard `_destroyed`.
- [x] Selesai & terverifikasi — + B15 clearTimeout finally; 2 test baru; 184 test runtime hijau

### B2. Race condition `ModuleLoader.load(id)`

- **Lokasi:** `loader.ts:74-118`
- **Fix:** in-flight promise map — caller kedua menunggu promise yang sama.
- [x] Selesai & terverifikasi — test konkurensi 3 caller paralel → factory jalan 1×

### B3. `unmountDrive` stale state

- **Lokasi:** `apps/web/modules/arunaos.files/stores/native-fs.store.ts:103-116`
- **Fix:** capture `wasActive` sebelum men-null variabel.
- [x] Selesai & terverifikasi

### B4. Cut/paste Finder = copy

- **Lokasi:** `modules/arunaos.files/components/finder.tsx:407-461`
- **Fix:** setelah paste sukses dengan mode `cut` → hapus sumber (virtual & native); tulis blob via buffer untuk virtual→native.
- [x] Selesai & terverifikasi — cut kini benar-benar move (hapus sumber), virtual→native membawa isi blob via arrayBuffer, copy virtual→virtual ikut menduplikasi blob

---

## Fase 3 — Performance

### P1. Streaming chat hot path (HIGH)

- **Lokasi:** `ai-chat.tsx:264-268, 575-599`
- **Fix:** buffer token via rAF/throttle ~80ms sebelum commit state; debounce persistensi localStorage 800ms + flush on stream end/unload.
- [x] Selesai — commitStream throttle 80ms; persist debounce 800ms + flush beforeunload via sessionsRef; `sessions` dikeluarkan dari deps sendMessage (stale closure) & terverifikasi

### P2. Lazy react-markdown

- **Lokasi:** `chat-messages.tsx:5-6`
- **Fix:** dynamic import markdown renderer.
- [x] Selesai — markdown+shiki dipindah ke markdown-content.tsx, di-load via React.lazy + Suspense fallback plain-text & terverifikasi

### P3. Window clamp on restore

- **Lokasi:** `window.store.ts` rehydrate
- **Fix:** clamp posisi/ukuran ke viewport saat rehydration; re-fit maximized.
- [x] Selesai — persist merge() clamp + maximized re-fit ke viewport saat ini & terverifikasi

### P4. Dedup health poll AI

- **Lokasi:** `ai-chat.tsx:249` + `ai-status.tsx:49`
- **Fix:** satu shared hook/store dengan cache 30s.
- [x] Selesai — use-ai-health.ts: subscriber-based loop, cache TTL 30s, auto stop saat idle; ai-chat & ai-status memakai hook yang sama & terverifikasi

---

## Fase 4 — Bug Medium & Low

### B5. Rate limiter lifetime bricking modul — `sandbox-v2.ts:177-181`

Sliding window berbasis timestamp bucket, bukan counter seumur hidup.

- [x] Selesai & terverifikasi — sliding 60s/600 calls

### B6. IPC router kehilangan `this` — `loader.ts:48-55`

Panggil `api[msg.method].call(api, msg.payload)` atau bind.

- [x] Selesai & terverifikasi — test end-to-end via EventBus memverifikasi `this` terjaga (increment → 42); 186 test runtime hijau

### B7. `ExternalModuleLoader.update()` read-after-delete + tanpa rollback — `external-loader.ts:285-295`

Capture source sebelum uninstall; rollback entry lama bila install baru gagal.

- [ ] Selesai & terverifikasi

### B8. Settings cache race — `packages/runtime/src/settings.ts:27-35`

Memoize loading promise per moduleId.

- [x] Selesai & terverifikasi

### B9. EventBus exception isolation — `packages/services/src/event-bus.ts:7-19`

try/catch per handler + log error; fix leak wrapper `once()` (unwrap sebelum handler jalan).

- [x] Selesai & terverifikasi — 88 test services hijau

### B10. `getSnapshot()` identitas baru tiap call — `runtime/src/store.ts:33-58`

Cache snapshot, invalidate via version counter.

- [x] Selesai & terverifikasi — snapshot cache + subscribe bus 'module:statusChange'; test identitas stabil baru; 186 test runtime hijau

### B11. Weather timezone — `control-center.tsx`, `weather-app.tsx`, `weather-module.tsx`

Parse tanggal date-only sebagai lokal (`new Date(y, m-1, d)`).

- [x] Selesai & terverifikasi — parseLocalDate + todayLocalISO di 3 file

### B12. Blob leak saat hapus folder — `files.store.ts:73-89`

Kumpulkan id descendant → deleteBlob semua.

- [x] Selesai & terverifikasi — deleteItem mengembalikan daftar id; 3 call site Finder membersihkan blob descendant

### Batch Low

- [x] B13 theme `system` subscribe matchMedia change + init() idempotent + dispose() (`services/theme.ts`)
- [x] B14 reset() memicu re-apply tema — emit per key yang berubah (deepEqual) (`services/settings.ts`)
- [x] B15 dangling timer handleRequest (clearTimeout di finally) — menyatu dengan B1
- [x] B16 stale `entry.error` registry — di-clear pada transisi non-error (`registry.ts:52-57`)
- [x] B17 IndexedDB destroy() → operasi berikutnya reject dengan pesan jelas (`storage.ts`)

---

## Fase 5 — Fitur Tambahan (opsional, terpisah)

| ID  | Fitur                                          | Catatan               |
| --- | ---------------------------------------------- | --------------------- |
| F1  | Trash Bin + restore                            | menutup B12 secara UX |
| F2  | Permission prompt saat install modul eksternal | pelengkap S1/S4       |
| F3  | Window snapping (edge tiling)                  |                       |
| F4  | Search riwayat chat + export Markdown          |                       |
| F5  | Import/export settings backup                  |                       |
| F6  | Keyboard shortcuts manager                     |                       |
| F7  | Quick model picker di toolbar chat             |                       |

---

## Metode Verifikasi per Item

1. `pnpm --filter <pkg> exec tsc --noEmit` (typecheck)
2. `pnpm --filter <pkg> lint`
3. `pnpm --filter <pkg> test` / targeted vitest run
4. Test baru ditulis untuk bug yang reproducible (B1, B2, B5, B6, B8, B9, B10, B16)
