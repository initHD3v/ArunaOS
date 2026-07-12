# Phase 6 — AI sebagai Otak dan Jiwa ArunaOS

## Vision

ArunaOS bukan OS biasa yang ditambahi fitur AI. ArunaOS adalah **AI-native operating system** — AI bukan fitur, melainkan fondasi. Seperti JARVIS untuk Iron Man: sistem yang hidup, proaktif, mengenali user, dan bertindak tanpa perlu diperintah.

---

## Prinsip Arsitektur

| Prinsip                         | Deskripsi                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **AI-first**                    | Setiap komponen sistem punya akses ke AI context. Bukan "app yang panggil AI", tapi "AI yang mengerti sistem" |
| **Proactive by default**        | AI tidak menunggu input. Dia mengobservasi, belajar, lalu bertindak                                           |
| **Memory persistence**          | Semua interaksi, preferensi, kebiasaan disimpan dalam memory graph — lintas session, lintas hari              |
| **Local-first, cloud-optional** | Default pakai built-in engine (template + lightweight model). Cloud LLM hanya upgrade opsional                |
| **Context-aware**               | AI tahu: jam berapa, cuaca, apps apa yang terbuka, task apa yang pending, kebiasaan user di jam ini           |

---

## Milestone

### Milestone 1: Aruna Engine — Built-in AI Core (Otak)

Tujuan: AI yang hidup di system level, bukan di app level.

**1.1 System AI Service (`@arunaos/engine`)**

- Package baru `packages/engine` — core AI system service
- Lifecycle: start saat OS boot, berjalan di background, sleep saat OS idle
- Tidak terikat window/app manapun

**1.2 Built-in Template Engine**

- Generate greeting, mood, suggestion tanpa LLM — template cerdas yang personal
- Context-aware: waktu, cuaca, task count, kebiasaan user
- Fallback default ketika tidak ada provider API key
- Zero dependency, works offline, zero setup

**1.3 Memory Graph**

- `MemoryStore` — simpan interaksi user, preferensi, kebiasaan dalam format graph
- Persistence ke IndexedDB (bukan localStorage — lebih besar, lebih reliable)
- Entities: User, Session, Task, AppUsage, Notification, Conversation
- Relationships: "user X sering buka app Y jam Z", "setiap habis greeting, user buka tasks"

**1.4 Context Aggregator**

- Kumpulkan state sistem secara real-time: waktu, cuaca, apps terbuka, focused window, task pending, notifikasi unread
- Sediakan context payload untuk prompt AI — sehingga LLM tahu keadaan sistem sekarang
- Update tiap ada event significant (window focus change, task selesai, notifikasi masuk)

### Milestone 2: Proactive Agent (Jiwa)

Tujuan: AI yang mengambil inisiatif, bukan cuma menjawab.

**2.1 Scheduler / Cron Engine**

- Trigger berkala: setiap pagi sapa, setiap jam cek notifikasi, setiap 30 menit cek task deadline
- Event-driven: saat app dibuka, saat task selesai, saat cuaca berubah drastis
- Prioritaskan aksi: urgent notification > daily greeting > passive suggestion

**2.2 Proactive Actions**

- Morning briefing otomatis (greeting + weather + tasks + notifications)
- Smart suggestion: "Kamu biasanya buka Files jam 9, mau saya bukakan?" — belajar dari pola
- Adaptive greeting: makin lama makin personal, pakai memory dari interaksi sebelumnya

**2.3 Agent Pipeline**

- `Observer` — kumpulkan data dari system events + scheduler
- `Reasoner` — pakai engine (template atau LLM) untuk decide: apakah perlu bertindak?
- `Actor` — execute action: tampilkan toast, buka app, kirim notifikasi, update greeting style

### Milestone 3: System Integration (Indra)

Tujuan: AI bisa melihat dan memengaruhi seluruh OS.

**3.1 Window Observer**

- Track window focus, app usage duration, pola navigasi
- Input untuk context aggregator + habit learning

**3.2 File System Context**

- File yang baru diakses, folder yang sering dibuka, project yang sedang aktif
- AI bisa suggest: "Ada file yang direvisi 3 hari lalu, mau dilanjutkan?"

**3.3 Notification Hub**

- Central pipe untuk semua notifikasi (email, social, system)
- AI filter, prioritaskan, dan ringkas notifikasi
- User tidak perlu cek 5 tempat — cukup lihat ArunaHome

**3.4 Module API for AI**

- Module apa pun bisa register "capability" ke AI — contoh: module email register "email:read"
- AI bisa panggil capability modules untuk execute actions
- Ekosistem: module developers bisa buat AI-powered features tanpa urus LLM

### Milestone 4: ArunaHome Evolution (Wajah)

Tujuan: ArunaHome jadi living interface yang berevolusi.

**4.1 Adaptive Layout**

- Layout cards berubah berdasarkan konteks: pagi tampilkan greeting besar, siang tampilkan task, malam tampilkan ringkasan
- User bisa kustomisasi: pin card, hide card, reorder

**4.2 Memory-Powered Greeting**

- AI ingat interaksi kemarin: "Selamat pagi! Kemarin kamu menyelesaikan 3 dari 5 tasks. Mau lanjutkan?"
- Pakai Memory Graph untuk personalisasi

**4.3 Proactive Card**

- Card khusus yang berisi saran proaktif dari AI
- Contoh: "Saya lihat kamu sering buka Settings akhir-akhir ini. Mau saya bantu configure AI?"

**4.4 Mood Tracker**

- Track mood dari interaksi harian
- Visualisasi mingguan: "Minggu ini mood kamu didominasi Focused dan Productive"

---

## File Structure Plan

```
packages/
  engine/                          # [NEW] System AI Service
    src/
      index.ts
      system-ai-service.ts         # Lifecycle: boot → observe → reason → act
      memory/
        memory-store.ts            # IndexedDB-based memory graph
        entities.ts                 # User, Session, AppUsage, dll
        habit-learner.ts           # Belajar pola dari memory
      context/
        context-aggregator.ts      # Kumpulin state sistem
        system-context.ts          # Waktu, cuaca, apps, task
      engine/
        template-engine.ts         # [NEW] Built-in template AI (zero dep)
        scheduler.ts               # [NEW] Cron + event-driven trigger
        agent-pipeline.ts          # [NEW] Observer → Reasoner → Actor
      integration/
        window-observer.ts         # Track window focus
        notification-hub.ts        # Central notification pipe
        module-ai-api.ts           # API untuk module register capability

apps/web/
  src/
    features/
      home/                        # [EXISTING] ArunaHome
        components/
          proactive-card.tsx       # [NEW] Card saran proaktif
          mood-tracker.tsx         # [NEW] Visualisasi mood harian
      aruna-engine/                # [NEW] UI untuk engine status
        components/
          engine-status.tsx        # Status AI engine (active/sleep/learning)
          memory-viewer.tsx        # Debug: lihat memory graph
```

---

## Implementasi Bertahap

### Fase 6a — Engine Core (Minggu 1-2)

- [ ] Buat `packages/engine` dengan template engine bawaan
- [ ] Implementasi Memory Graph dengan IndexedDB
- [ ] Context Aggregator untuk system state
- [ ] Integrasi ke system lifecycle (boot → ready → sleep)
- [ ] Fallback: template engine aktif, LLM sebagai upgrade opsional

### Fase 6b — Agent & Proactivity (Minggu 3-4)

- [ ] Scheduler: cron + event-driven triggers
- [ ] Agent pipeline: Observer → Reasoner → Actor
- [ ] Window observer untuk habit learning
- [ ] ArunaHome greeting jadi adaptive (pake memory)
- [ ] Proactive card dengan saran AI

### Fase 6c — Integrasi Penuh (Minggu 5-6)

- [ ] Notification hub — central pipe untuk semua notifikasi
- [ ] Module AI API — module bisa register capability
- [ ] Mood tracker + visualisasi
- [ ] Adaptive layout ArunaHome

### Fase 6d — Maturation (Berkelanjutan)

- [ ] Fine-tune habit learning algorithms
- [ ] Optimasi memory graph query
- [ ] User feedback loop untuk improve suggestions
- [ ] Dokumentasi untuk module developers

---

## Teknologi

| Komponen          | Pilihan                    | Alasan                                                     |
| ----------------- | -------------------------- | ---------------------------------------------------------- |
| Memory Storage    | IndexedDB via `idb-keyval` | Lebih besar dari localStorage, cocok untuk graph data      |
| Template Engine   | Custom (zero dep)          | Generate greeting/mood tanpa LLM — lightweight, offline    |
| LLM Integration   | Existing `@arunaos/ai`     | 4 providers sudah support — on demand                      |
| Scheduling        | Custom cron (no dep)       | Simple interval + event pattern, tidak perlu library berat |
| State Management  | Zustand + persist          | Already used, cocok untuk partial persistence              |
| IPC (Module ↔ AI) | Event bus (existing)       | Service provider sudah support event system                |

---

## Catatan Penting

1. **Template engine adalah default, LLM adalah upgrade** — ArunaOS harus hidup tanpanya API key. Template engine memastikan ArunaHome selalu punya "kepribadian"
2. **Memory tidak hilang** — IndexedDB persist lintas session. User bisa tutup browser, buka lagi besok, AI ingat semuanya
3. **Privacy first** — Semua memory dan context processing terjadi secara lokal. Cloud LLM hanya dipakai jika user explicit config API key
4. **Proactive ≠ Annoying** — Ada "do not disturb" mode. User bisa atur seberapa proaktif AI-nya: pasif, balanced, atau aktif
