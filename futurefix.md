# Future Fixes

## Desktop Icon Drag-reorder Tidak Berfungsi

**Masalah**: Desktop icons tidak bisa dipindah/drag-reorder sama sekali.

### Yang sudah dicoba:

1. **HTML5 DnD di wrapper `<div>` + native `dragover` di container**
   - `draggable` + `onDragStart`/`onDragEnd` di `<div data-desktop-icon>`
   - Native `dragover` listener (`useEffect`) di container untuk `preventDefault()`
   - React `onDrop` di container untuk finalisasi
   - Hasil: ❌ Tidak berfungsi

2. **Pointer events dengan `setPointerCapture`**
   - `onPointerDown` capture → `onPointerMove` track → `onPointerUp` finalisasi
   - Hasil: ❌ Pointer capture hilang saat React re-render

3. **`draggable` pindah ke `motion.button` (di dalam `DesktopIcon`)**
   - Karena user mengklik langsung `motion.button`, `draggable` dipindah ke sana
   - `onDragStart`/`onDragEnd` via native event listeners (`useEffect`) karena Framer Motion blok React prop
   - Hasil: ❌ Tidak berfungsi — Framer Motion kemungkinan `preventDefault()` di `pointerdown`

4. **Ganti `motion.button` → plain `<div>`**
   - `DesktopIcon` sekarang pakai `<div>` biasa, tanpa Framer Motion
   - CSS `active:scale-95` + `hover:bg-white/5` gantikan `whileTap`/`whileHover`
   - `draggable` tetap di wrapper `<div data-desktop-icon>` di `DesktopGrid`
   - Hasil: ❌ Masih tidak berfungsi

### Kemungkinan penyebab:

- Browser macOS butuh press-and-hold sebelum drag; mungkin ada konflik gesture
- `flex flex-wrap` layout dengan `gap` menyebabkan area kosong di container yang tidak mendeteksi drop
- CSS `cursor-default` atau properti lain menghalangi DnD
- Faktor lain di event propagation / DOM structure

### Langkah debugging selanjutnya:

1. Tambah `console.log('dragstart', e)` di `onDragStart` untuk verifikasi apakah event `dragstart` pernah terpanggil
2. Tambah `console.log('dragover', e)` di native `dragover` listener
3. Cek apakah ghost image drag muncul saat mulai drag
4. Coba dengan `ondragstart` handler langsung di HTML (inline) sebagai test
5. Kalau `dragstart` tidak pernah terpanggil, berarti browser tidak mendeteksi drag intent → kemungkinan `draggable` tidak aktif di elemen tersebut

### Alternatif approach yang mungkin:

- **Gunakan library**: `@dnd-kit/core` atau `react-beautiful-dnd` yang sudah handle semua edge case browser
- **Custom implementasi pointer events** tanpa `setPointerCapture`, pakai `document.addEventListener` untuk `pointermove`/`pointerup` setelah `pointerdown` terdeteksi
- **Pisahkan click dan drag**: `pointerdown` mulai track, threshold 5px baru mulai drag mode
