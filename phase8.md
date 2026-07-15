# Phase 8 — AI Enhanced & Perfection

## Vision

ArunaOS memiliki fondasi AI yang kuat: `@arunaos/engine` sebagai otak system-level, `@arunaos/ai` sebagai adapter LLM, dan `Aruna Assistant` sebagai wajah yang berinteraksi dengan user. Phase 8 bukan tentang membangun yang baru, melainkan **menyatukan, menyempurnakan, dan membuat AI terasa hidup**.

Tujuan akhir: Aruna Assistant bukan sekadar panel yang bisa diajak ngobrol — dia adalah **intelligence layer** yang proaktif, personal, dan terintegrasi penuh dengan setiap sudut sistem.

---

## Prinsip

| Prinsip                        | Deskripsi                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Integration over invention** | Jangan buat engine baru. Sambungkan yang sudah ada: `ArunaEngine` → `ArunaCore` → UI                           |
| **Perceptible intelligence**   | AI harus terasa cerdas secara kasat mata — greeting yang personal, saran yang relevan, reaksi yang kontekstual |
| **Memory-first**               | Setiap interaksi adalah investasi. Makin sering dipakai, makin pintar                                          |
| **Proactive, not intrusive**   | AI boleh inisiatif, tapi tidak mengganggu. User tetap kontrol penuh                                            |
| **Offline-capable**            | Semua kecerdasan inti harus jalan tanpa API key. LLM hanya upgrade                                             |

---

## Milestone

### Milestone 1: Engine → Assistant Integration (Jembatan)

Tujuan: `ArunaEngine` (system-level) dan `ArunaCore` (frontend assistant) berbicara dalam bahasa yang sama.

**1.1 Unified Context Pipeline**

Saat ini context terpecah:

- `ContextEngine` di frontend mengumpulkan waktu, cuaca, location
- `ContextAggregator` di package engine mengumpulkan system state, memory, habits

Yang harus dilakukan:

- `ArunaCore` menggunakan `ContextAggregator` dari `@arunaos/engine` sebagai sumber context utama
- `ContextEngine` frontend cukup sebagai fallback / enhancer (weather, location)
- Context terpusat: satu source of truth untuk seluruh sistem

**1.2 Memory Bridge**

- `MemoryEngine` frontend (short-term, conversation) sinkron dengan `MemoryStore` backend (long-term, habit)
- Percakapan di Aruna Assistant otomatis terekam ke `MemoryStore` via `HabitLearner`
- `MemoryGraphOptimizer` bisa dipakai untuk query "apa yang user lakukan kemarin?"

**1.3 Personality Sync**

- `PersonalityEngine` di frontend menggunakan `TemplateEngine` dari `@arunaos/engine`
- Greeting style, tone, dan saran konsisten antara assistant dan system notification
- Konfigurasi personality bisa diubah dari Settings > Assistant

---

### Milestone 2: Smart Proactivity (Kecerdasan Proaktif)

Tujuan: AI tidak menunggu diperintah. Dia tahu kapan harus bicara, kapan diam.

**2.1 Scheduler-Driven Suggestions**

- `Scheduler` dari `@arunaos/engine` trigger suggestion refresh di Aruna Assistant
- Jadwal: morning briefing (08:00), midday check (12:00), evening wrap (18:00)
- Suggestions tidak statis — berubah berdasarkan waktu dan konteks nyata

**2.2 Context-Aware Reactions**

Asisten bereaksi terhadap perubahan sistem secara real-time:

- Cuaca berubah drastis → suggestion "Hujan bentar lagi, mau saya tutupkan jendela?"
- Window focus pindah ke app tertentu → suggestion relevan dengan app itu
- Task selesai → apresiasi + saran lanjutan
- Idle lama → fade tanpa mengganggu

**2.3 Adaptive Greeting**

Greeting tidak sekadar "Good Morning, User":

- Hari ini ada event di calendar → "Selamat pagi! Ada meeting 30 menit lagi"
- Kemarin banyak task selesai → "Good morning! Kemarin produktif sekali, 5 task beres"
- Sudah 3 hari tidak buka ArunaOS → "Welcome back! Ada 12 notifikasi menunggu"
- Pakai `HabitLearner.getInsights()` + `MemoryStore` untuk personalisasi

---

### Milestone 3: Memory & Learning (Ingatan & Pembelajaran)

Tujuan: ArunaOS tidak lupa. Setiap interaksi membuatnya lebih pintar.

**3.1 Cross-Session Memory**

- Percakapan dengan Aruna Assistant tersimpan di `MemoryStore` (IndexedDB)
- Buka besok: "Kemarin kamu nanya tentang cuaca, hari ini diperkirakan hujan"
- Riwayat pencarian, aplikasi yang dibuka, task yang dibuat — semua connect

**3.2 Habit Learning di Frontend**

- `LearningEngine` di frontend mencatat:
  - Jam berapa user biasanya buka ArunaOS
  - App apa yang pertama dibuka di pagi hari
  - Pola pengaturan window (split, fullscreen, ukuran tertentu)
  - Waktu produktif vs waktu santai
- Data dikirim ke `HabitLearner` di engine untuk analisis pola

**3.3 Productivity Insights**

- Ringkasan harian otomatis di sore hari:
  - "Hari ini kamu membuka 8 window, menghabiskan 2 jam di Files"
  - "Jam 10-12 adalah waktu paling produktifmu"
  - "Kamu cenderung membuka Settings setelah makan siang"
- Tampil di Aruna Assistant sebagai card ringkasan

**3.4 Memory Viewer (Debug & Insight)**

- Panel di Settings > Assistant untuk melihat memory:
  - Interaksi terakhir, habit yang terdeteksi, pola yang dipelajari
  - Bisa hapus memory tertentu atau reset semua
  - Transparan: user tahu apa yang AI ingat tentang mereka

---

### Milestone 4: UX Perfection (Penyempurnaan Pengalaman)

Tujuan: Setiap interaksi dengan AI terasa mulus, natural, dan menyenangkan.

**4.1 Smooth State Transitions**

- State machine assistant diperhalus:
  - `idle` → `observing` → `thinking` → `speaking` dengan animasi halus
  - Loading state yang informatif (bukan spinner generic)
  - Typing indicator yang natural saat AI "berpikir"

**4.2 Rich Suggestions**

Suggestion cards tidak hanya teks:

- Bisa punya tombol aksi langsung: "Buka Files", "Kirim Email", "Lihat Calendar"
- Progress bar untuk task yang sedang berjalan
- Expandable card untuk detail lebih lanjut
- Animasi masuk/keluar yang halus

**4.3 Multi-Modal Input**

- Voice input yang lebih responsif (existing voice button + Web Speech API)
- Keyboard shortcut untuk quick input (sudah ada)
- Drag-and-drop file ke assistant untuk analisis
- Screenshot share langsung ke AI

**4.4 Ambient Presence**

- Collapsed button tidak hanya logo — bisa tampilkan:
  - Cuaca singkat (26°)
  - Notifikasi unread count
  - Status AI (thinking/dll) tanpa perlu expand panel
- Auto-fade yang cerdas: tidak fade jika ada notifikasi penting
- Double-click collapsed button untuk quick action tanpa expand penuh

---

### Milestone 5: System-Wide AI Hooks (AI di Seluruh Sistem)

Tujuan: AI tidak hanya di assistant panel, tapi terasa di setiap sudut ArunaOS.

**5.1 AI-Enhanced Search**

- Command palette (`Cmd+K`) pakai AI untuk interpretasi intent:
  - "buka file laporan kemarin" → search + open file
  - "kirim pesan ke budi" → shortcut ke module chat
  - "cuaca besok" → tampilkan forecast tanpa buka app
- Search results di-ranking berdasarkan konteks dan habit

**5.2 Proactive Notification**

- Notifikasi sistem yang dibantu AI:
  - "Task deadline dalam 1 jam" → muncul 30 menit sebelumnya
  - "Ada update module" → hanya muncul jika user sering pakai module itu
  - "Battery low" → suggestion untuk enable power saving
- Menggunakan `NotificationHub` dari engine untuk prioritization

**5.3 Context Menu AI**

- Klik kanan di desktop / file → "Tanya Aruna tentang ini"
- File terpilih → AI bisa summarize, rename, atau categorize
- Window aktif → AI suggest actions berdasarkan konten window

**5.4 Adaptive Layout (Dock & Desktop)**

- Dock menyesuaikan: app yang paling sering dipakai di pagi vs sore hari
- Desktop wallpaper berubah subtle berdasarkan mood / waktu (sudah ada theme engine)
- Window default size dan posisi belajar dari kebiasaan user

---

### Milestone 6: Quality & Polish (Kualitas & Sentuhan Akhir)

Tujuan: Semua fitur AI berjalan stabil, cepat, dan dapat diandalkan.

**6.1 Performance Optimization**

- Lazy load engine components: jangan load `HabitLearner` kalau tidak dipakai
- Cache context agar tidak re-fetch tiap kali panel dibuka
- Debounce suggestion generation saat user sedang mengetik
- Virtualisasi memory viewer untuk performa

**6.2 Error Handling & Graceful Fallback**

- Jika engine gagal load → assistant tetap bisa jalan dengan template sederhana
- Jika API key tidak valid → fallback ke template engine
- Jika memory store corrupt → reset otomatis + notifikasi user
- Semua error tidak boleh bikin crash — harus graceful

**6.3 Testing**

- Unit test untuk integrasi `ArunaEngine` → `ArunaCore`
- Integration test untuk memory → suggestion pipeline
- Test untuk setiap skenario proactivity
- Coverage minimal 80% untuk engine + assistant engine

**6.4 Accessibility**

- Keyboard navigasi penuh di assistant panel
- Screen reader support untuk greeting, suggestions, context
- Focus trap yang benar saat panel terbuka
- Color contrast yang sesuai untuk semua elemen AI

---

## File Structure — Perubahan yang Diperlukan

```
apps/web/src/features/aruna-assistant/
  ├── aruna-assistant.tsx           # [MODIFY] Integrasi scheduler, ambient presence
  ├── stores/
  │   ├── aruna-assistant-store.ts  # [MODIFY] Sinkronisasi memory dengan engine
  │   └── aruna-assistant-settings.store.ts  # [MODIFY] Tambah setting personality, proactivity
  └── engines/
      ├── aruna-core.ts             # [MODIFY] Gunakan ContextAggregator dari @arunaos/engine
      ├── context-engine.ts         # [MODIFY] Jadi wrapper, bukan primary source
      ├── personality-engine.ts     # [MODIFY] Ambil greeting style dari TemplateEngine
      ├── memory-engine.ts          # [MODIFY] Bridge ke MemoryStore + HabitLearner
      ├── learning-engine.ts        # [MODIFY] Kirim data habit ke HabitLearner
      └── scheduler-bridge.ts       # [NEW] Jembatan Scheduler engine → assistant

apps/web/src/features/settings/components/
  ├── assistant-settings.tsx        # [MODIFY] Tambah personality, proactivity, memory settings
  └── memory-viewer.tsx             # [NEW] Lihat/hapus memory AI

packages/engine/src/
  ├── system-ai-service.ts          # [MODIFY] Expose method untuk frontend bridge
  └── index.ts                      # [MODIFY] Export bridge utilities
```

---

## Implementasi Bertahap

### Fase 8a — Integrasi Engine (Minggu 1)

- [ ] Bridge `ContextAggregator` → `ArunaCore` sebagai primary context source
- [ ] Sinkronisasi `MemoryEngine` ↔ `MemoryStore` (percakapan terekam ke engine)
- [ ] `Scheduler` trigger suggestion refresh di assistant
- [ ] Expose method `ArunaEngine` untuk frontend via bridge module
- [ ] Typecheck + test lulus

### Fase 8b — Proactivity & Adaptive Behavior (Minggu 2)

- [ ] Scheduler-driven morning/midday/evening suggestions
- [ ] Context-aware reactions: cuaca, window focus, task
- [ ] Adaptive greeting dengan memory + habit insights
- [ ] Habit learning dari aktivitas frontend (app usage, window pattern)
- [ ] Productivity summary card di assistant

### Fase 8c — UX & Polish (Minggu 3)

- [ ] Smooth state transitions (idle → thinking → speaking)
- [ ] Rich suggestion cards dengan action buttons
- [ ] Ambient presence: cuaca, notif count di collapsed button
- [ ] Multi-modal: voice polish, drag-drop file ke assistant
- [ ] Memory viewer di Settings > Assistant

### Fase 8d — System-Wide AI (Minggu 4)

- [ ] AI-enhanced search di command palette
- [ ] Proactive notification via NotificationHub
- [ ] Context menu AI (tanya aruna tentang file/window ini)
- [ ] Adaptive dock & desktop layout berdasarkan habit

### Fase 8e — Hardening (Minggu 5)

- [ ] Performance optimization (lazy load, cache, debounce)
- [ ] Error handling + graceful fallback di semua layer
- [ ] Test coverage minimal 80% untuk engine + assistant
- [ ] Accessibility (keyboard, screen reader, contrast)
- [ ] Dokumentasi integrasi untuk developer

---

## Catatan Penting

1. **Jangan rewrite** — `ArunaEngine` dan `ArunaCore` sudah matang. Fokus pada koneksi dan penyempurnaan.
2. **Memory adalah aset** — Setiap interaksi yang terekam membuat sistem makin personal. Pastikan persistence reliable.
3. **Proactivity harus diukur** — Jangan sampai AI terlalu agresif. Setting "Proactivity Level" di assistant settings: Pasif / Balanced / Aktif.
4. **Privacy tetap prioritas** — Semua memory lokal. Tidak ada data yang dikirim ke cloud tanpa explicit consent.
5. **Test adalah fondasi** — Setiap bridge dan integrasi baru harus punya test sebelum merge.
