# ADR-003: BullMQ & Redis Scope — Background Operations Only

**Status:** Accepted  
**Date:** 2026-07-09  
**Author:** ArunaOS(INITHD3V)  
**Decision Type:** Architecture  

---

## Context

Stack ArunaOS mencakup **BullMQ** (queue) dan **Redis** (cache) sesuai Phase0.md §12. Tanpa scope yang jelas, developer bisa tergoda menggunakan Redis/BullMQ untuk operasi inti workspace — yang akan menambah latency tiap interaksi user.

## Decision

**BullMQ dan Redis hanya digunakan untuk background/async operations.**

### In Scope (Background)

| Use Case | Teknologi | Alasan |
|----------|-----------|--------|
| Push notification delivery | BullMQ | Async, tidak perlu realtime |
| Email/Sync processing | BullMQ | Bisa antri, tidak urgent |
| AI provider rate limiting | Redis | Token bucket, key-value murni |
| Session cache (auth tokens) | Redis | TTL-based, fast lookup |
| File indexing / thumbnail generation | BullMQ | Heavy process, background |
| Background task engine | BullMQ | Defined di Phase0 Product Scope |
| Notification engine queue | BullMQ | Defined di Phase0 Product Scope |

### Out of Scope (Sync / User-Facing)

| Use Case | Larangan | Alternatif |
|----------|----------|------------|
| Window state persistence | ❌ Redis | Zustand persist middleware → IndexedDB |
| AI response caching | ❌ Redis (sync) | TanStack Query (stale-while-revalidate) |
| User preferences | ❌ Redis | TanStack Query → PostgreSQL |
| Workspace layout | ❌ Redis | Zustand persist → IndexedDB |
| File content cache | ❌ Redis | Service Worker + Cache API |
| Real-time collaboration | ❌ Redis pub/sub | WebSocket langsung |

### Prinsip

```
User Interaction
      │
      ▼
  Zustand (sync, client) ←── IndexedDB (persist)
      │
      ▼
  TanStack Query (async, server cache) ←── PostgreSQL
      │
      ├── WebSocket (realtime → Zustand)
      │
      └── API Server
              │
              ├── BullMQ (background jobs)  ←── Redis (job queue)
              │
              └── Redis (session, rate limit, non-critical cache)
```

## Consequences

- **Positive:** User-facing latency tidak terpengaruh Redis/BullMQ
- **Positive:** Redis bisa di-scale independently untuk background workload
- **Positive:** Developer punya boundary jelas — jika ragu, jawabannya bukan Redis
- **Negative:** Harus maintain dua storage strategy (IndexedDB + server DB)

## References

- Phase0.md §12 Technical Stack
- Phase0.md §6 Product Scope (Background Task Engine, Notification Engine)