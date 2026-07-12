# Panduan Membuat Modul ArunaOS

Panduan ini akan memandu Anda langkah demi langkah untuk membuat modul ArunaOS, mulai dari persiapan lingkungan pengembangan, menulis kode modul, hingga menginstalnya ke dalam sistem ArunaOS. Sebagai contoh, kita akan membuat **Modul Kalkulator** sederhana.

---

## Daftar Isi

1. [Persiapan](#1-persiapan)
   - [1.1. Memahami Tipe Modul](#11-memahami-tipe-modul)
   - [1.2. Persiapan Lingkungan untuk Modul Built-in](#12-persiapan-lingkungan-untuk-modul-built-in)
   - [1.3. Persiapan Lingkungan untuk Modul Eksternal](#13-persiapan-lingkungan-untuk-modul-eksternal)
2. [Membuat Modul](#2-membuat-modul)
   - [2.1. Membuat Modul Built-in (Calculator)](#21-membuat-modul-built-in-calculator)
   - [2.2. Membuat Modul Eksternal (Calculator)](#22-membuat-modul-eksternal-calculator)
3. [Mendaftarkan Modul ke ArunaOS](#3-mendaftarkan-modul-ke-arunaos)
   - [3.1. Registrasi Modul Built-in](#31-registrasi-modul-built-in)
   - [3.2. Registrasi Modul Eksternal](#32-registrasi-modul-eksternal)
4. [Menginstal Modul ke ArunaOS](#4-menginstal-modul-ke-arunaos)
   - [4.1. Instalasi Modul Built-in](#41-instalasi-modul-built-in)
   - [4.2. Instalasi Modul Eksternal](#42-instalasi-modul-eksternal)
5. [Struktur Lengkap Modul Calculator](#5-struktur-lengkap-modul-calculator)
6. [API Sistem yang Tersedia untuk Modul](#6-api-sistem-yang-tersedia-untuk-modul)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Persiapan

### 1.1. Memahami Tipe Modul

ArunaOS memiliki dua tipe modul:

| Tipe | Deskripsi | Cocok Untuk |
|---|---|---|
| **Built-in** | Modul yang menjadi bagian dari repositori ArunaOS, ditulis dalam TypeScript/React, dan dikompilasi bersama sistem. | Developer yang berkontribusi langsung ke ArunaOS. |
| **Eksternal** | Modul standalone yang dikembangkan di luar repositori ArunaOS, dibundel menjadi `bundle.js`, dan diinstal melalui AppStore. | Developer pihak ketiga yang ingin membuat aplikasi untuk ArunaOS. |

### 1.2. Persiapan Lingkungan untuk Modul Built-in

Untuk membuat modul built-in, Anda perlu menjalankan ArunaOS secara lokal:

```bash
# Clone repositori
git clone https://github.com/initHD3v/ArunaOS.git
cd ArunaOS

# Install dependencies
pnpm install

# Jalankan development server
pnpm dev
```

Modul built-in berada di direktori `apps/web/modules/`. Setiap modul memiliki folder sendiri dengan nama `arunaos.<nama-modul>/`.

### 1.3. Persiapan Lingkungan untuk Modul Eksternal

Untuk modul eksternal, Anda hanya membutuhkan:

```bash
# Node.js versi 18 atau lebih baru
node --version

# Package manager (npm/pnpm/yarn)
npm --version

# Install CLI ArunaOS
npm install -g @arunaos/module-cli

# Verifikasi instalasi
arunaos --help
```

CLI (`@arunaos/module-cli`) menyediakan perintah `create`, `build`, `dev`, `validate`, `migrate`, dan `publish` — mencakup seluruh siklus pengembangan modul dari scaffolding hingga publikasi. Ini adalah **satu-satunya cara yang didukung** untuk membangun modul eksternal; CLI menangani bundling, penandatanganan checksum, dan validasi manifest secara otomatis.

Anda tidak perlu menjalankan ArunaOS secara lokal untuk mengembangkan modul eksternal. Cukup buat kode, build, dan instal melalui AppStore.

---

## 2. Membuat Modul

Kita akan membuat **Modul Calculator** — kalkulator sederhana dengan operasi dasar (+, -, ×, ÷).

### 2.1. Membuat Modul Built-in (Calculator)

#### Langkah 1: Buat Struktur Folder

```bash
cd apps/web/modules/
mkdir -p arunaos.calculator/components
```

#### Langkah 2: Buat File Manifest (`module.json`)

Buat file `apps/web/modules/arunaos.calculator/module.json`:

```json
{
  "id": "arunaos.calculator",
  "name": "Calculator",
  "version": "1.0.0",
  "description": "Kalkulator sederhana dengan operasi dasar",
  "icon": "calculator",
  "entry": "./index.tsx",
  "type": "builtin",
  "permissions": [],
  "window": {
    "defaultWidth": 280,
    "defaultHeight": 400,
    "resizable": false,
    "titleBar": true
  },
  "dependencies": [],
  "api": {
    "expose": [],
    "require": []
  }
}
```

**Penjelasan properti:**

| Properti | Deskripsi |
|---|---|
| `id` | ID unik modul. Format: `arunaos.<nama>`. Hanya boleh `[a-z0-9._-]`. |
| `name` | Nama tampilan modul. |
| `version` | Versi modul (semver). |
| `description` | Deskripsi singkat. |
| `icon` | Nama ikon (merujuk ke sistem ikon ArunaOS). |
| `entry` | Path ke file entry modul. |
| `type` | `"builtin"` untuk modul bawaan, `"external"` untuk modul pihak ketiga. |
| `permissions` | Daftar izin yang diperlukan. Calculator tidak membutuhkan izin khusus. |
| `window` | Konfigurasi jendela modul saat dibuka. |
| `api.expose` | Method yang diekspos ke modul lain via IPC. |
| `api.require` | Modul lain yang wajib terpasang sebagai dependensi. |

#### Langkah 3: Buat Entry Point (`index.tsx`)

Buat file `apps/web/modules/arunaos.calculator/index.tsx`:

```tsx
export { Calculator } from './components/calculator';
```

#### Langkah 4: Buat Komponen Kalkulator

Buat file `apps/web/modules/arunaos.calculator/components/calculator.tsx`:

```tsx
'use client';

import { useState, useCallback } from 'react';

type Operator = '+' | '-' | '×' | '÷' | null;

export function Calculator() {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = useCallback((digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  }, [display, waitingForOperand]);

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  }, [display, waitingForOperand]);

  const clear = useCallback(() => {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  }, []);

  const performOperation = useCallback((nextOperator: Operator) => {
    const currentValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(currentValue);
    } else if (operator) {
      const result = calculate(prevValue!, currentValue, operator);
      setDisplay(String(result));
      setPrevValue(result);
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  }, [display, prevValue, operator]);

  const calculate = (a: number, b: number, op: Operator): number => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '×': return a * b;
      case '÷': return b !== 0 ? a / b : NaN;
      default: return b;
    }
  };

  const equals = useCallback(() => {
    const currentValue = parseFloat(display);
    if (prevValue !== null && operator) {
      const result = calculate(prevValue!, currentValue, operator);
      setDisplay(String(result));
      setPrevValue(null);
      setOperator(null);
      setWaitingForOperand(false);
    }
  }, [display, prevValue, operator]);

  const btnStyle: React.CSSProperties = {
    width: 56,
    height: 56,
    fontSize: 18,
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
  };

  const numberStyle: React.CSSProperties = {
    ...btnStyle,
    background: '#2C2C2E',
    color: '#FFFFFF',
  };

  const operatorStyle: React.CSSProperties = {
    ...btnStyle,
    background: '#FF9F0A',
    color: '#FFFFFF',
  };

  const functionStyle: React.CSSProperties = {
    ...btnStyle,
    background: '#636366',
    color: '#FFFFFF',
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#1C1C1E',
      fontFamily: "'SF Pro Display', -apple-system, sans-serif",
      userSelect: 'none',
    }}>
      {/* Display */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        padding: '20px',
      }}>
        <span style={{
          fontSize: 48,
          fontWeight: 300,
          color: '#FFFFFF',
          lineHeight: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
        }}>
          {display}
        </span>
      </div>

      {/* Keypad */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 56px)',
        gap: 8,
        padding: '12px 16px 20px',
        justifyContent: 'center',
      }}>
        <button style={functionStyle} onClick={clear}>AC</button>
        <button style={functionStyle} onClick={() => setDisplay(
          String(parseFloat(display) * -1)
        )}>±</button>
        <button style={functionStyle} onClick={() => setDisplay(
          String(parseFloat(display) / 100)
        )}>%</button>
        <button style={operatorStyle} onClick={() => performOperation('÷')}>÷</button>

        {['7','8','9'].map((d) => (
          <button key={d} style={numberStyle} onClick={() => inputDigit(d)}>{d}</button>
        ))}
        <button style={operatorStyle} onClick={() => performOperation('×')}>×</button>

        {['4','5','6'].map((d) => (
          <button key={d} style={numberStyle} onClick={() => inputDigit(d)}>{d}</button>
        ))}
        <button style={operatorStyle} onClick={() => performOperation('-')}>-</button>

        {['1','2','3'].map((d) => (
          <button key={d} style={numberStyle} onClick={() => inputDigit(d)}>{d}</button>
        ))}
        <button style={operatorStyle} onClick={() => performOperation('+')}>+</button>

        <button style={{ ...numberStyle, gridColumn: 'span 2', width: 120 }} onClick={() => inputDigit('0')}>0</button>
        <button style={numberStyle} onClick={inputDecimal}>,</button>
        <button style={operatorStyle} onClick={equals}>=</button>
      </div>
    </div>
  );
}
```

> **Catatan:** Kalkulator di atas menggunakan inline styles untuk kemandirian komponen. Jika Anda ingin menggunakan Tailwind CSS, pastikan konfigurasi Tailwind mencakup path modul Anda.

#### Selesai! Struktur folder modul built-in Anda:

```
apps/web/modules/arunaos.calculator/
├── module.json
├── index.tsx
└── components/
    └── calculator.tsx
```

Anda belum bisa melihatnya di ArunaOS karena modul perlu didaftarkan terlebih dahulu. Lanjut ke bagian [Registrasi Modul Built-in](#31-registrasi-modul-built-in).

---

### 2.2. Membuat Modul Eksternal (Calculator)

Untuk modul eksternal, Anda tidak perlu meng-clone repositori ArunaOS. Cukup buat proyek baru di mana saja.

#### Langkah 1: Inisialisasi Proyek

```bash
mkdir arunaos-calculator
cd arunaos-calculator
npm init -y
```

#### Langkah 2: Buat File Manifest (`module.json`)

```json
{
  "id": "com.example.calculator",
  "name": "Calculator",
  "version": "1.0.0",
  "description": "Kalkulator sederhana untuk ArunaOS",
  "icon": "calculator",
  "entry": "./bundle.js",
  "type": "external",
  "permissions": [],
  "window": {
    "defaultWidth": 280,
    "defaultHeight": 400,
    "resizable": false,
    "titleBar": true
  },
  "api": {
    "expose": [],
    "require": []
  }
}
```

Perbedaan utama dengan modul built-in:

| Properti | Built-in | Eksternal |
|---|---|---|
| `id` | `arunaos.<nama>` | Bebas, misal `com.example.calculator` |
| `entry` | `./index.tsx` (source) | `./bundle.js` (hasil build) |
| `type` | `"builtin"` | `"external"` |

#### Langkah 3: Buat Entry Point (`src/index.js`)

```javascript
// SystemAPI akan disuntikkan oleh runtime ArunaOS
let systemAPI = null;

export const api = {
  mount(params) {
    console.log('Calculator mounted', params);
    return 'Calculator siap digunakan';
  },

  unmount() {
    console.log('Calculator unmounted');
  },

  sleep() {
    console.log('Calculator sleep');
  },

  resume() {
    console.log('Calculator resumed');
  },
};

export default api;
```

> **Catatan:** Modul eksternal tidak bisa merender komponen React secara langsung karena dijalankan di dalam sandbox iframe. Modul eksternal mengekspor API yang bisa dipanggil oleh sistem, dan UI-nya akan ditampilkan sebagai placeholder sampai ada dukungan rendering penuh untuk eksternal module.

#### Langkah 4: Build Modul

```bash
# Build module ke folder dist/
arunaos build .

# Hasil: dist/bundle.js + dist/module.json (dengan checksum + updatedAt otomatis)
```

CLI akan:
- Membundel dan meminifikasi kode dengan esbuild
- Menyalin `module.json` ke `dist/` secara otomatis
- Menghitung SHA-256 checksum dan memperbarui `dist/module.json`

#### Hasil Build:

```
dist/
├── bundle.js      # Kode yang sudah dibundel dan diminifikasi
└── module.json    # Manifest dengan checksum dan updatedAt otomatis
```

#### Langkah 5: Hosting

Upload folder `dist/` ke server web statis (GitHub Pages, Vercel, Netlify, dll.) atau serve secara lokal:

```bash
npx serve ./dist
```

Catat URL tempat Anda meng-host modul. URL ini akan digunakan saat instalasi.

---

## 3. Mendaftarkan Modul ke ArunaOS

### 3.1. Registrasi Modul Built-in

Untuk modul built-in, ada **6 titik integrasi** yang harus Anda sambungkan:

#### 3.1.1. Daftarkan Manifest di Service Provider

Buka `apps/web/src/providers/service-provider.tsx`. Cari array `builtinManifests` (sekitar baris 104-283) dan tambahkan manifest calculator:

```typescript
const builtinManifests: ModuleManifest[] = [
  // ... manifest yang sudah ada ...
  {
    id: 'arunaos.calculator',
    name: 'Calculator',
    version: '1.0.0',
    description: 'Kalkulator sederhana dengan operasi dasar',
    icon: 'calculator',
    entry: './index.tsx',
    type: 'builtin',
    permissions: [],
    window: {
      defaultWidth: 280,
      defaultHeight: 400,
      resizable: false,
      titleBar: true,
    },
    dependencies: [],
    api: { expose: [], require: [] },
  },
  // ... manifest lainnya ...
];
```

Kemudian daftarkan factory-nya (cari bagian `registerFactory` di service-provider.tsx):

```typescript
moduleLoader.registerFactory('arunaos.calculator', async () => {
  return { api: {} };
});
```

#### 3.1.2. Daftarkan App ID Mapping

Buka `apps/web/src/services/module-window.ts` dan tambahkan ke `MODULE_APP_ID_MAP`:

```typescript
export const MODULE_APP_ID_MAP: Record<string, string> = {
  'arunaos.files': 'files',
  'arunaos.settings': 'settings',
  'arunaos.calculator': 'calculator',  // <-- Tambahkan ini
  // ... lainnya ...
};
```

Mapping ini memastikan saat module dibuka melalui `moduleWindow.openModule('arunaos.calculator')`, window yang terbuka memiliki `appId: 'calculator'`.

#### 3.1.3. Daftarkan Komponen UI ke Module Renderer

Buka `apps/web/src/features/modules/components/module-renderer.tsx`:

Tambahkan dynamic import:

```tsx
const Calculator = dynamic(
  () => import('@modules/arunaos.calculator/components/calculator').then((m) => ({ default: m.Calculator })),
  { ssr: false, loading },
);
```

Lalu daftarkan di `MODULE_COMPONENTS`:

```typescript
const MODULE_COMPONENTS: Record<string, React.ComponentType> = {
  // ... komponen yang sudah ada ...
  'arunaos.calculator': Calculator,
};
```

#### 3.1.4. Daftarkan ke Window Manager (jika perlu)

Buka `apps/web/src/features/window-manager/components/window.tsx`. Cari bagian yang me-render app berdasarkan `appId` (sekitar baris 290-310):

```tsx
// Cari bagian seperti ini:
{data.appId === 'module-installer' && <ModuleInstaller />}

// Tambahkan:
{data.appId === 'calculator' && <Calculator />}
```

Jangan lupa import komponen Calculator di bagian atas file:

```tsx
import { Calculator } from '@modules/arunaos.calculator/components/calculator';
```

#### 3.1.5. (Opsional) Daftarkan ke Dock

Buka `apps/web/src/features/dock/stores/dock.store.ts` dan tambahkan ke `DEFAULT_ITEMS`:

```typescript
const DEFAULT_ITEMS: DockItem[] = [
  // ... item yang sudah ada ...
  {
    id: 'calculator',
    type: 'app',
    label: 'Calculator',
    icon: 'calculator',  // Pastikan ikon ini ada di sistem
    action: { type: 'openModule', moduleId: 'arunaos.calculator' },
  },
];
```

#### 3.1.6. (Opsional) Daftarkan ke Pencarian

Di `service-provider.tsx`, tambahkan ke indeks pencarian (cari bagian `search.indexItems`):

```typescript
search.indexItems('modules', [
  // ... item yang sudah ada ...
  {
    id: 'arunaos.calculator',
    title: 'Calculator',
    description: 'Kalkulator sederhana',
    keywords: ['kalkulator', 'math', 'hitung'],
    icon: 'calculator',
    action: { type: 'openModule', moduleId: 'arunaos.calculator' },
  },
]);
```

### 3.2. Registrasi Modul Eksternal

Modul eksternal **tidak perlu registrasi manual di kode sumber**. Registrasi dilakukan melalui **AppStore** oleh pengguna akhir. Anda hanya perlu:

1. Build modul → dapatkan `dist/bundle.js` + `dist/module.json`
2. Host folder `dist/` di URL publik
3. (Opsional) Publikasikan ke registry ArunaOS agar muncul di AppStore

Publikasi ke registry:

```bash
arunaos publish ./dist --api-key=<api-key-anda>
```

Atau jika ingin pengguna menginstal secara offline, berikan mereka file `module.json` dan `bundle.js`.

---

## 4. Menginstal Modul ke ArunaOS

### 4.1. Instalasi Modul Built-in

Setelah semua registrasi selesai, modul built-in langsung tersedia tanpa perlu instalasi terpisah:

1. **Restart development server** (jika sedang berjalan):
   ```bash
   # Tekan Ctrl+C, lalu:
   pnpm dev
   ```

2. **Buka ArunaOS** di browser Anda.

3. **Buka modul** melalui:
   - **Dock** (jika didaftarkan): Klik ikon Calculator di dock.
   - **Search/Command Palette** (`Cmd+K` atau `Ctrl+K`): Ketik "Calculator".
   - **Module Window API**: Dari modul lain atau dari kode, panggil:
     ```typescript
     const moduleWindow = useService<ModuleWindowService>('moduleWindow');
     await moduleWindow.openModule('arunaos.calculator');
     ```

### 4.2. Instalasi Modul Eksternal

**Melalui AppStore (dari Registry Online)**

1. Buka aplikasi **AppStore** dari dock.
2. Cari modul "Calculator" atau telusuri kategori.
3. Klik **Install**.
4. Modul akan terunduh, diverifikasi, dan terinstal.
5. Buka dari dock atau search.

**Melalui Offline Install (File Lokal)**

1. Buka aplikasi **AppStore** dari dock.
2. Masuk ke tab **Offline Install**.
3. **Drag & drop** file `module.json` dan `bundle.js` ke area yang disediakan.
4. Klik **Install from Local Files**.
5. Sistem akan memvalidasi manifest, memverifikasi checksum, dan mendaftarkan modul.
6. Modul siap digunakan.

**Melalui URL**

1. Buka aplikasi **AppStore**.
2. Masuk ke tab **Install from URL**.
3. Masukkan URL ke folder `dist/` (misal: `https://example.com/calculator/`).
4. Klik **Install**.
5. Sistem akan mengambil `module.json` dari URL tersebut, mendownload `bundle.js`, memverifikasi checksum, dan mendaftarkan modul.

---

## 5. Struktur Lengkap Modul Calculator

### Built-in Module (Final Structure)

```
apps/web/modules/arunaos.calculator/
├── module.json                  # Manifest modul
├── index.tsx                    # Entry point (re-export komponen)
└── components/
    └── calculator.tsx           # Komponen React kalkulator
```

### External Module (Final Structure)

```
arunaos-calculator/
├── module.json                  # Manifest modul
├── src/
│   └── index.js                 # Source code entry point
├── dist/                        # Hasil build
│   ├── module.json              # Manifest dengan checksum
│   └── bundle.js                # Kode yang sudah dibundel
└── package.json                 # (opsional, untuk dependencies)
```

### Diagram Alur Modul Calculator Saat Dibuka

```
User klik ikon Calculator di Dock
        │
        ▼
Dock Store → action: { type: 'openModule', moduleId: 'arunaos.calculator' }
        │
        ▼
ModuleWindowService.openModule('arunaos.calculator')
        │
        ├─ 1. Cari manifest di ModuleRegistry
        ├─ 2. Panggil moduleLoader.load('arunaos.calculator')
        │       │
        │       ├─ Built-in: panggil factory → import komponen React
        │       └─ Eksternal: fetch bundle.js → eval di sandbox
        │
        ├─ 3. Map appId: 'arunaos.calculator' → 'calculator'
        ├─ 4. Buka window baru via WindowManager
        │       │
        │       ▼
        └─ Window menampilkan komponen Calculator
```

---

## 6. API Sistem yang Tersedia untuk Modul

Setiap modul yang dimuat mendapatkan akses ke **SystemAPI** melalui parameter `mount()`:

| API | Deskripsi | Izin Diperlukan |
|---|---|---|
| `notify(type, message, options?)` | Mengirim notifikasi desktop | `notification` |
| `storage.get(key)` | Membaca data dari penyimpanan lokal | `storage:read` |
| `storage.set(key, value)` | Menulis data ke penyimpanan lokal | `storage:write` |
| `storage.delete(key)` | Menghapus data dari penyimpanan lokal | `storage:write` |
| `settings.get(key)` | Membaca pengaturan sistem | — |
| `settings.set(key, value)` | Mengubah pengaturan sistem | — |
| `theme.getMode()` | Mendapatkan tema saat ini (light/dark) | — |
| `theme.setMode(mode)` | Mengubah tema sistem | — |
| `openWindow(config)` | Membuka jendela baru | — |
| `closeWindow(windowId)` | Menutup jendela | — |
| `logger.info/warn/error` | Mencetak log | — |

### Contoh Penggunaan API

```typescript
// Di dalam hook mount(params, systemAPI)
mount(params, systemAPI) {
  // Kirim notifikasi
  systemAPI.notify('info', 'Calculator siap digunakan!');

  // Simpan riwayat perhitungan
  systemAPI.storage.set('riwayat', JSON.stringify([{ operasi: '1+1', hasil: 2 }]));

  // Baca riwayat
  const riwayat = JSON.parse(systemAPI.storage.get('riwayat') ?? '[]');

  // Logging
  systemAPI.logger.info('Calculator', 'Modul dimuat', { params });
}
```

> **Catatan untuk modul built-in:** Modul built-in berjalan dalam konteks React yang sama dengan ArunaOS, sehingga bisa menggunakan hook React, Tailwind CSS, dan komponen sistem lainnya. Modul built-in mengakses SystemAPI melalui service container, bukan melalui parameter `mount()`.

---

## 7. Troubleshooting

### CLI `@arunaos/module-cli` tidak ditemukan

**Penyebab:** CLI belum diinstal atau versi Node.js tidak memenuhi syarat.

**Solusi:**

```bash
# Instal CLI secara global
npm install -g @arunaos/module-cli

# Atau jalankan langsung tanpa instalasi
npx @arunaos/module-cli --help
```

Pastikan Node.js versi 18 atau lebih baru:

```bash
node --version
```

### Modul tidak muncul di Dock atau Search

**Penyebab:** Manifest belum didaftarkan di `service-provider.tsx` atau komponen belum ditambahkan ke `MODULE_COMPONENTS`.

**Solusi:** Pastikan semua 6 titik integrasi di [bagian 3.1](#31-registrasi-modul-built-in) sudah dilakukan.

### Window terbuka tapi kosong

**Penyebab:** Komponen React belum didaftarkan di `module-renderer.tsx` atau `window.tsx`.

**Solusi:** Periksa:
- Apakah `MODULE_COMPONENTS` di `module-renderer.tsx` sudah mencakup ID modul Anda?
- Apakah `window.tsx` sudah memiliki conditional render untuk `appId` modul Anda?

### "Module has no UI component" muncul

**Penyebab:** `MODULE_APP_ID_MAP` di `module-window.ts` belum diisi.

**Solusi:** Tambahkan mapping ID modul Anda. Jika tidak ada mapping, window akan membuka dengan `appId: 'module-arunaos.calculator'`, tapi `MODULE_COMPONENTS` mencari `'arunaos.calculator'` — terjadi mismatch.

### Error: `ModuleManifest is not registered`

**Penyebab:** Modul belum didaftarkan ke `ModuleRegistry` di `service-provider.tsx`.

**Solusi:** Pastikan manifest calculator ada di dalam array `builtinManifests`.

### Modul Eksternal gagal diinstal dari URL

**Penyebab:** URL tidak mengarah ke `module.json` atau CORS tidak diizinkan.

**Solusi:** Pastikan server Anda:
- Menyajikan file `module.json` di root path yang dituju.
- Mengizinkan CORS (`Access-Control-Allow-Origin: *`).
- File `bundle.js` memiliki checksum yang cocok dengan `module.json`.

### Checksum mismatch saat instalasi eksternal

**Penyebab:** `module.json` berisi `checksum` yang tidak sesuai dengan hash SHA-256 `bundle.js` yang sebenarnya.

**Solusi:** Bangun ulang modul dengan CLI:

```bash
arunaos build .
```

CLI akan otomatis menghitung ulang checksum yang benar dan memperbarui `dist/module.json`.

---

## Referensi

- [Panduan Pengembang ArunaOS](./2_developer_guide.md) — Dokumentasi teknis lebih mendalam.
- [Arsitektur Teknis ArunaOS](./3_technical_architecture.md) — Arsitektur sistem secara keseluruhan.
- Source code modul bawaan: `apps/web/modules/arunaos.*/` — Contoh modul yang sudah jadi.
- Module renderer: `apps/web/src/features/modules/components/module-renderer.tsx`
- Module window service: `apps/web/src/services/module-window.ts`
- Service provider (registrasi): `apps/web/src/providers/service-provider.tsx`
