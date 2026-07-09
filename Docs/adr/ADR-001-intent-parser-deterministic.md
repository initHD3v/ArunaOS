# ADR-001: Intent Parser Deterministic untuk Action Instan

**Status:** Accepted  
**Date:** 2026-07-09  
**Author:** ArunaOS(INITHD3V)  
**Decision Type:** Architecture  

---

## Context

ArunaOS dibangun di atas arsitektur Intent-based: User → Intent → Intent Parser → Context Engine → AI Provider → Action Engine → Workspace. Kekhawatiran utama adalah **latency** — jika setiap interaksi (buka file, resize window, navigasi) harus menunggu AI provider, maka:

- Startup < 2 detik tidak tercapai
- Navigasi < 100ms tidak tercapai
- User experience jadi terasa lamban

## Decision

**Intent Parser HARUS bersifat deterministic untuk action sederhana.**

### Pemetaan Intent Category

| Kategori | Parser | Latency Target |
|----------|--------|---------------|
| System Actions (buka file, resize, close, minimize, search) | **Local deterministic** — pattern matching via finite state machine | < 10ms |
| Workflow Actions (multi-step, ambigu, "kirim email ke Budi lampirkan file X") | AI Provider | < 2s |
| Creative Actions (tulis puisi, generate gambar, summarise) | AI Provider | sesuai provider |

### Implementasi

- Intent Parser adalah **layer pertama** yang berjalan 100% di client (Web Worker)
- Intent Parser menggunakan rule-based FSM (Finite State Machine) untuk system actions
- Intent Parser hanya meneruskan ke AI Provider jika:
  1. Pattern tidak dikenal / ambigu (confidence < 90%)
  2. Memerlukan konteks eksternal (email, file content, kalender)
  3. Explicitly creative (perintah "tulis", "gambar", "buatkan")

## Consequences

- **Positive:** Semua operasi sistem tetap instan tanpa bergantung AI
- **Positive:** Beban API AI berkurang drastis
- **Negative:** Harus maintain FSM rules. Setiap system action baru perlu ditambahkan rule manual.
- **Mitigation:** FSM rules ditulis sebagai deklaratif config, bukan hardcode — mudah ditambah tanpa deploy ulang core.

## References

- Phase0.md §18 AI Architecture
- Phase0.md §9 Performance Goals