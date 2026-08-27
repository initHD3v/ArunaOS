'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Monitor,
  Dock,
  PanelTop,
  AppWindow,
  Settings,
  Keyboard,
  Puzzle,
  Compass,
  ArrowLeft,
  ArrowRight,
  X,
  Globe,
  Folder,
  Image as ImageIcon,
  LayoutGrid,
  Command,
  Search,
  Palette,
  Sun,
  Moon,
  Grid3X3,
} from 'lucide-react';

type Lang = 'id' | 'en';

interface TourContent {
  title: string;
  subtitle: string;
  body: string[];
  tips?: string[];
  kicker: string;
}

const content = {
  id: [
    {
      kicker: 'Pendahuluan',
      title: 'Halo,\nSelamat Datang.',
      subtitle: 'Ruang kerja pintar yang ngerti kamu',
      body: [
        'ArunaOS itu lingkungan kerja yang jalan di browser — beda dari OS pada umumnya. Di sini, semuanya dirancang biar interaksi kamu sama komputer terasa lebih alami.',
        'Mau buka file, ganti wallpaper, atau cari sesuatu? Semua bisa dilakukan dengan cepat, tanpa ribet. Langsung aja jelajah, atau ikut tur singkat ini biar lebih familiar.',
      ],
    },
    {
      kicker: '01 — Workspace',
      title: 'Desktop.\nLapak kerja utama.',
      subtitle: 'Kanvas kosong siap kamu isi',
      body: [
        'Desktop adalah tempat kamu memulai semuanya. Klik kanan di area kosong buat lihat menu cepat — ganti wallpaper, buka terminal, atau akses pengaturan.',
        'Personalisasi dengan koleksi gradien curated atau upload gambar sendiri. Semua tersimpan otomatis.',
      ],
      tips: ['Klik kanan di desktop → Ganti Wallpaper', 'Coba tema di Settings > Appearance'],
    },
    {
      kicker: '02 — Launcher',
      title: 'Dock.\nSatu klik,\nlangsung jalan.',
      subtitle: 'Peluncur aplikasi andalan',
      body: [
        'Dock di bawah layar: satu klik buka atau fokuskan app. Titik kecil = sedang berjalan. Seret untuk reorder, klik kanan untuk opsi.',
        'Pin favorit kamu. Dock ingat urutan bahkan setelah restart.',
      ],
      tips: ['Klik ikon buat buka / fokuskan', 'Seret buat atur ulang posisi'],
    },
    {
      kicker: '03 — System',
      title: 'Menu Bar.\nKontrol dalam\nsatu baris.',
      subtitle: 'Semua status sekilas pandang',
      body: [
        'Paling atas: logo Aruna di kiri untuk About, Restart, Shutdown. Kanan: jam, tanggal, Control Center, dan toggle cepat.',
        'Klik waktu untuk kalender. Klik Sliders untuk Control Center.',
      ],
      tips: ['Klik logo Aruna buat menu sistem'],
    },
    {
      kicker: '04 — Windows',
      title: 'Window\nManager.',
      subtitle: 'Atur jendela dengan bebas',
      body: [
        'Setiap app di jendelanya sendiri. Geser title bar, tarik sudut untuk resize.',
        'Traffic light merah/kuning/hijau: tutup, minimize, maximize. Switch cepat pakai Ctrl + ] / [.',
      ],
      tips: [
        'Ctrl+] — Jendela berikutnya',
        'Ctrl+[ — Jendela sebelumnya',
        'Cmd+W — Tutup jendela aktif',
      ],
    },
    {
      kicker: '05 — Personalize',
      title: 'Pengaturan.\nBikin jadi\npunya kamu.',
      subtitle: 'Tema, wallpaper, dan keamanan',
      body: [
        'Settings adalah pusat kontrol: Light, Dark, AMOLED, High Contrast, koleksi wallpaper, shortcut, dan password.',
        'Semua perubahan live preview — lihat efeknya sebelum save.',
      ],
      tips: ['Cmd+K — cari pengaturan apapun', 'Coba High Contrast untuk aksesibilitas'],
    },
    {
      kicker: '06 — Speed',
      title: 'Pintasan.\nKerja tanpa\nsentuh mouse.',
      subtitle: 'Naik level pakai keyboard',
      body: [
        'Hafal 4 pintasan ini dan navigasi jadi 2× lebih cepat. Semua pintasan bisa di-remap di Settings.',
      ],
      tips: [
        'Cmd+K — Command Palette',
        'Ctrl+] / [ — Fokus jendela',
        'Cmd+W — Tutup jendela',
        'Cmd+Shift+M — Module DevTools',
        'Esc — Tutup overlay',
      ],
    },
    {
      kicker: '07 — Extend',
      title: 'Module.\nApp kecil,\ntenaga besar.',
      subtitle: 'Aplikasi siap pakai, tinggal pencet',
      body: [
        'ArunaOS modular: tiap app jalan di sandbox terpisah — aman & terkelola.',
        'Files, AStat, Camera, AppStore sudah built-in. Butuh app baru? Install dari AppStore tanpa reload.',
      ],
      tips: ['Cmd+Shift+M — inspeksi module'],
    },
    {
      kicker: '08 — Go',
      title: 'Siap\nMulai?',
      subtitle: 'Gas aja dulu!',
      body: [
        'Gak perlu manual. Buka Settings, ganti tema. Buka Files, jelajah. Tekan Cmd+K, ketik yang kamu cari.',
        'ArunaOS dibuat untuk dieksplor. Klik-klik aja — kamu bakal nemu hal baru tiap hari.',
      ],
    },
  ],
  en: [
    {
      kicker: 'Intro',
      title: 'Hello,\nWelcome.',
      subtitle: 'A smart workspace that gets you',
      body: [
        'ArunaOS is a browser-based operating environment — different from a regular OS. Everything is designed to make interaction feel natural.',
        "Open files, change wallpaper, or search — it's all quick. Start exploring, or follow this short tour.",
      ],
    },
    {
      kicker: '01 — Workspace',
      title: 'Desktop.\nWhere it all\nbegins.',
      subtitle: 'A blank canvas, ready to make yours',
      body: [
        'Right-click the empty area for the quick menu — change wallpaper, open terminal, or settings.',
        'Personalize with curated gradients or your own image. Everything autosaves.',
      ],
      tips: ['Right-click → Change Wallpaper', 'Try themes in Settings > Appearance'],
    },
    {
      kicker: '02 — Launcher',
      title: 'Dock.\nOne click\nto launch.',
      subtitle: 'Your app launcher',
      body: [
        'The Dock at the bottom: one click opens or focuses. A dot means running. Drag to reorder, right-click for more.',
        'Pin your favorites — order persists after restart.',
      ],
      tips: ['Click to open / focus', 'Drag to rearrange'],
    },
    {
      kicker: '03 — System',
      title: 'Menu Bar.\nAll controls\nin one line.',
      subtitle: 'Every status at a glance',
      body: [
        'Top bar: Aruna logo on the left for About, Restart, Shutdown. Right: clock, date, Control Center.',
        'Click the time for calendar. Click Sliders for Control Center.',
      ],
      tips: ['Click Aruna logo for system menu'],
    },
    {
      kicker: '04 — Windows',
      title: 'Window\nManager.',
      subtitle: 'Freedom to arrange',
      body: [
        'Every app lives in its own window. Drag the title bar, pull corners to resize.',
        'Traffic lights red/yellow/green: close, minimize, maximize. Switch with Ctrl + ] / [.',
      ],
      tips: ['Ctrl+] — Next window', 'Ctrl+[ — Previous window', 'Cmd+W — Close active'],
    },
    {
      kicker: '05 — Personalize',
      title: 'Settings.\nMake it\nyours.',
      subtitle: 'Themes, wallpapers & security',
      body: [
        'Settings is the control center: Light, Dark, AMOLED, High Contrast, wallpapers, shortcuts, and password.',
        'Live preview — see changes before you save.',
      ],
      tips: ['Cmd+K — find any setting', 'Try High Contrast for accessibility'],
    },
    {
      kicker: '06 — Speed',
      title: 'Shortcuts.\nWork without\nthe mouse.',
      subtitle: 'Level up with keyboard',
      body: ['Learn four shortcuts and navigate 2× faster. All remappable in Settings.'],
      tips: [
        'Cmd+K — Command Palette',
        'Ctrl+] / [ — Focus window',
        'Cmd+W — Close window',
        'Cmd+Shift+M — Module DevTools',
        'Esc — Close overlay',
      ],
    },
    {
      kicker: '07 — Extend',
      title: 'Modules.\nSmall apps,\nbig power.',
      subtitle: 'Ready-to-use apps',
      body: [
        'Modular architecture: each app runs in its own sandbox — safer and isolated.',
        'Files, AStat, Camera, AppStore are built-in. Need more? Install from AppStore without reload.',
      ],
      tips: ['Cmd+Shift+M — inspect modules'],
    },
    {
      kicker: '08 — Go',
      title: 'Ready\nto start?',
      subtitle: 'Go for it!',
      body: [
        'No manual needed. Open Settings, pick a theme. Open Files, browse. Press Cmd+K and search.',
        "ArunaOS is built to be explored. Click around — you'll discover something new every day.",
      ],
    },
  ],
} satisfies Record<Lang, TourContent[]>;

const stepIcons = [
  Sparkles,
  Monitor,
  Dock,
  PanelTop,
  AppWindow,
  Settings,
  Keyboard,
  Puzzle,
  Compass,
];

const stepThemes = [
  {
    from: 'from-violet-500/30',
    via: 'via-fuchsia-500/15',
    accent: 'text-violet-600',
    ring: 'ring-violet-500/20',
    blob: 'bg-violet-500',
  },
  {
    from: 'from-emerald-500/30',
    via: 'via-teal-500/15',
    accent: 'text-emerald-600',
    ring: 'ring-emerald-500/20',
    blob: 'bg-emerald-500',
  },
  {
    from: 'from-blue-500/30',
    via: 'via-sky-500/15',
    accent: 'text-blue-600',
    ring: 'ring-blue-500/20',
    blob: 'bg-blue-500',
  },
  {
    from: 'from-amber-500/30',
    via: 'via-orange-500/15',
    accent: 'text-amber-600',
    ring: 'ring-amber-500/20',
    blob: 'bg-amber-500',
  },
  {
    from: 'from-rose-500/30',
    via: 'via-pink-500/15',
    accent: 'text-rose-600',
    ring: 'ring-rose-500/20',
    blob: 'bg-rose-500',
  },
  {
    from: 'from-purple-500/30',
    via: 'via-violet-500/15',
    accent: 'text-purple-600',
    ring: 'ring-purple-500/20',
    blob: 'bg-purple-500',
  },
  {
    from: 'from-cyan-500/30',
    via: 'via-sky-500/15',
    accent: 'text-cyan-600',
    ring: 'ring-cyan-500/20',
    blob: 'bg-cyan-600',
  },
  {
    from: 'from-fuchsia-500/30',
    via: 'via-pink-500/15',
    accent: 'text-fuchsia-600',
    ring: 'ring-fuchsia-500/20',
    blob: 'bg-fuchsia-500',
  },
  {
    from: 'from-indigo-500/30',
    via: 'via-violet-500/15',
    accent: 'text-indigo-600',
    ring: 'ring-indigo-500/20',
    blob: 'bg-indigo-500',
  },
];

function Visual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="relative flex h-full w-full items-center justify-center p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.08] via-fuchsia-500/[0.06] to-transparent" />
        <div className="absolute left-8 top-8 h-24 w-24 rounded-full bg-violet-500/10 blur-2xl" />
        <div className="absolute bottom-10 right-8 h-32 w-32 rounded-full bg-fuchsia-500/10 blur-2xl" />
        <div className="relative">
          <div className="absolute -inset-6 rounded-[28px] bg-white/40 blur-2xl dark:bg-white/5" />
          <div className="border-border/20 bg-card/80 relative flex h-[132px] w-[132px] items-center justify-center rounded-[24px] border shadow-xl backdrop-blur-xl">
            <Sparkles size={44} className="text-violet-600 dark:text-violet-400" />
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white shadow">
              ✦
            </span>
          </div>
        </div>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="relative flex h-full w-full flex-col gap-3 p-5 sm:p-6">
        <div className="border-border/15 bg-card/60 flex items-center gap-2 rounded-xl border px-3 py-2 shadow-sm backdrop-blur">
          <div className="h-2 w-2 rounded-full bg-red-400" />
          <div className="h-2 w-2 rounded-full bg-yellow-400" />
          <div className="h-2 w-2 rounded-full bg-green-400" />
          <span className="text-foreground/50 ml-2 text-[11px]">Desktop</span>
          <span className="bg-muted text-foreground/40 ml-auto h-5 rounded-md px-2 text-[10px] leading-5">
            Right-click
          </span>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-2.5">
          {[
            'from-violet-400 to-fuchsia-400',
            'from-emerald-400 to-teal-400',
            'from-blue-400 to-sky-400',
            'from-amber-400 to-orange-400',
            'from-rose-400 to-pink-400',
            'from-cyan-400 to-blue-400',
          ].map((g, i) => (
            <div
              key={i}
              className={cn(
                'relative overflow-hidden rounded-xl bg-gradient-to-br shadow-sm ring-1 ring-black/5',
                g,
                i === 0 && 'ring-2 ring-violet-500/30',
              )}
            >
              {i === 0 && (
                <span className="absolute right-1.5 top-1.5 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-semibold text-violet-700">
                  ✓
                </span>
              )}
              <div className="absolute inset-0 bg-white/10" />
            </div>
          ))}
        </div>
        <div className="border-border/20 bg-card/90 flex items-center gap-2 rounded-xl border px-3 py-2.5 shadow-lg backdrop-blur-xl">
          <ImageIcon size={14} className="text-foreground/50" />
          <span className="text-xs font-medium">Ganti Wallpaper</span>
          <span className="bg-muted text-foreground/40 ml-auto rounded px-1.5 py-0.5 font-mono text-[10px]">
            ⌘
          </span>
        </div>
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center gap-4 p-6">
        <div className="border-border/20 bg-background/70 flex items-center gap-1 rounded-2xl border px-3 py-2.5 shadow-xl backdrop-blur-2xl">
          {[Folder, AppWindow, Compass, Settings, Grid3X3, Monitor].map((Icon, i) => (
            <div
              key={i}
              className={cn(
                'relative flex flex-col items-center gap-1 rounded-xl px-3 py-1.5',
                i === 1 && 'bg-foreground/[0.06]',
              )}
            >
              <Icon
                size={20}
                className={cn(i === 1 ? 'text-foreground' : 'text-foreground/60')}
                strokeWidth={1.6}
              />
              {i === 1 && <span className="bg-foreground h-1 w-1 rounded-full" />}
              {i === 3 && <span className="bg-foreground/50 h-1 w-1 rounded-full" />}
            </div>
          ))}
        </div>
        <div className="text-foreground/50 flex items-center gap-2 text-[11px]">
          <span className="bg-foreground/10 rounded px-1.5 py-0.5">Drag</span>
          <span>to reorder</span>
          <span className="bg-foreground/10 rounded px-1.5 py-0.5">Right-click</span>
          <span>for more</span>
        </div>
      </div>
    );
  }
  if (index === 3) {
    return (
      <div className="relative flex h-full w-full flex-col p-5">
        <div className="border-border/20 bg-background/80 overflow-hidden rounded-xl border shadow-sm backdrop-blur">
          <div className="border-border/10 flex h-8 items-center justify-between border-b px-3">
            <div className="flex items-center gap-1.5">
              <img src="/logo.png" alt="" className="h-4 w-4" />
              <span className="text-xs font-semibold">Aruna</span>
              <span className="bg-muted text-foreground/40 ml-2 hidden rounded px-1.5 py-0.5 text-[10px] sm:inline">
                File Edit
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-foreground/50 hidden text-[11px] sm:inline">Sel, 27 Agu</span>
              <span className="bg-muted rounded-md px-2 py-0.5 text-xs font-medium tabular-nums">
                10:42
              </span>
              <div className="flex gap-1">
                <span className="bg-muted h-5 w-5 rounded-md" />
                <span className="bg-foreground flex h-5 w-5 items-center justify-center rounded-md text-[10px] text-white">
                  ◧
                </span>
              </div>
            </div>
          </div>
          <div className="bg-muted/20 p-3">
            <div className="border-border/20 bg-card mx-auto max-w-[220px] rounded-lg border p-2 shadow-sm">
              <div className="flex items-center gap-2 text-xs">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/15 text-violet-600">
                  ⦿
                </span>
                <div>
                  <div className="text-xs font-medium">About ArunaOS</div>
                  <div className="text-foreground/40 text-[10px]">Version 2.0</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-foreground/50 mt-3 text-center text-[11px]">Click logo → system menu</p>
      </div>
    );
  }
  if (index === 4) {
    return (
      <div className="relative flex h-full w-full items-center justify-center p-5">
        <div className="border-border/20 bg-card w-full max-w-[320px] overflow-hidden rounded-2xl border shadow-xl">
          <div className="border-border/10 bg-muted/30 flex h-8 items-center gap-1.5 border-b px-3">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-green-400" />
            <span className="ml-2 text-xs font-medium">Files — ArunaOS</span>
            <span className="bg-muted text-foreground/40 ml-auto hidden h-5 rounded px-1.5 text-[10px] leading-5 sm:inline">
              ⌃ ] / [
            </span>
          </div>
          <div className="grid grid-cols-[1fr_1.4fr] gap-0">
            <div className="border-border/10 bg-muted/10 border-r p-2.5">
              <div className="space-y-1">
                <div className="bg-foreground text-background rounded-md px-2 py-1 text-xs font-medium">
                  Recents
                </div>
                <div className="text-foreground/50 px-2 py-1 text-xs">Documents</div>
                <div className="text-foreground/50 px-2 py-1 text-xs">Downloads</div>
              </div>
            </div>
            <div className="p-2.5">
              <div className="grid grid-cols-3 gap-2">
                {['#8b5cf6', '#06b6d4', '#f59e0b'].map((c, i) => (
                  <div key={i} className="space-y-1">
                    <div
                      className="aspect-square rounded-lg"
                      style={{ background: c, opacity: 0.15 }}
                    />
                    <div className="bg-muted h-1.5 w-10 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="border-border/10 bg-muted/20 text-foreground/50 flex justify-between border-t px-3 py-1.5 text-[10px]">
            <span>3 items</span>
            <span>Drag edges to resize ↘</span>
          </div>
        </div>
      </div>
    );
  }
  if (index === 5) {
    return (
      <div className="relative flex h-full w-full flex-col gap-3 p-5">
        <div className="border-border/15 bg-card/60 grid grid-cols-2 gap-2 rounded-xl border p-3 backdrop-blur">
          {[
            { label: 'Appearance', icon: Palette, active: true },
            { label: 'Wallpaper', icon: ImageIcon, active: false },
            { label: 'Language', icon: Globe, active: false },
            { label: 'Shortcuts', icon: Keyboard, active: false },
          ].map((it) => (
            <div
              key={it.label}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs',
                it.active
                  ? 'bg-foreground text-background border-foreground shadow'
                  : 'bg-muted/40 border-border/20',
              )}
            >
              <it.icon size={14} />
              {it.label}
            </div>
          ))}
        </div>
        <div className="border-border/20 bg-card flex items-center gap-3 rounded-xl border px-3 py-3 shadow-sm">
          <div className="flex gap-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow ring-1 ring-black/10">
              <Sun size={12} />
            </span>
            <span className="bg-foreground flex h-7 w-7 items-center justify-center rounded-full text-white">
              <Moon size={12} />
            </span>
          </div>
          <div className="text-xs">
            <div className="font-medium">AMOLED</div>
            <div className="text-foreground/40 text-[11px]">True black</div>
          </div>
          <span className="ml-auto rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-semibold text-white">
            Live
          </span>
        </div>
      </div>
    );
  }
  if (index === 6) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center gap-4 p-6">
        <div className="bg-card border-border/20 w-full max-w-[300px] rounded-xl border p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium">
            <Search size={14} className="text-foreground/40" />
            Command Palette
            <span className="bg-muted ml-auto rounded px-1.5 py-0.5 font-mono text-[10px]">⌘K</span>
          </div>
          <div className="space-y-1.5">
            <div className="bg-foreground text-background flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs">
              <Command size={12} />
              Change wallpaper…
              <span className="ml-auto text-[10px] opacity-60">↵</span>
            </div>
            <div className="text-foreground/40 px-2.5 py-1.5 text-xs">Open Settings</div>
            <div className="text-foreground/40 px-2.5 py-1.5 text-xs">Toggle theme</div>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {['⌘K', '⌃ ]', '⌃ [', '⌘W', '⇧⌘M', 'Esc'].map((k) => (
            <span
              key={k}
              className={cn(
                'rounded-md border bg-white px-2 py-1 font-mono text-[11px] shadow-sm dark:bg-zinc-900',
                k === '⌘K' && 'border-violet-500/30 ring-2 ring-violet-500/30',
              )}
            >
              {k}
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (index === 7) {
    return (
      <div className="relative grid h-full w-full grid-cols-2 gap-2.5 p-5">
        {[
          { name: 'Files', icon: Folder, desc: 'File manager', color: 'bg-blue-500' },
          { name: 'AStat', icon: Grid3X3, desc: 'System monitor', color: 'bg-emerald-500' },
          { name: 'Camera', icon: ImageIcon, desc: 'Capture', color: 'bg-amber-500' },
          { name: 'AppStore', icon: LayoutGrid, desc: 'Discover apps', color: 'bg-violet-500' },
        ].map((m) => (
          <div
            key={m.name}
            className="border-border/15 bg-card relative overflow-hidden rounded-xl border p-3 shadow-sm"
          >
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg text-white',
                m.color,
              )}
            >
              <m.icon size={14} />
            </div>
            <div className="mt-2 text-xs font-semibold">{m.name}</div>
            <div className="text-foreground/40 text-[11px]">{m.desc}</div>
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </div>
        ))}
        <div className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg bg-violet-500/10 py-2 text-[11px] font-medium text-violet-700 dark:text-violet-300">
          <Puzzle size={12} />
          Sandbox & permissions isolated
        </div>
      </div>
    );
  }
  // 8
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="relative">
        <div className="absolute -inset-6 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 blur-2xl" />
        <div className="border-border/20 bg-card relative flex h-28 w-28 items-center justify-center rounded-[28px] border shadow-xl">
          <Compass size={40} className="text-violet-600" />
        </div>
        <span className="absolute -right-1 -top-1 rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-bold text-white shadow">
          Ready
        </span>
      </div>
      <div className="flex gap-1">
        {['Files', 'Settings', 'AStat'].map((n) => (
          <span key={n} className="bg-muted rounded-full px-2.5 py-1 text-[11px] font-medium">
            {n}
          </span>
        ))}
      </div>
      <p className="text-foreground/50 text-xs">Klik apapun & mulai eksplor →</p>
    </div>
  );
}

interface OSTourProps {
  onClose: () => void;
}

export function OSTour({ onClose }: OSTourProps) {
  const [lang, setLang] = useState<Lang>('id');
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const steps = content[lang];
  const step = steps[current]!;
  const isFirst = current === 0;
  const isLast = current === steps.length - 1;
  const Icon = stepIcons[current]!;
  const theme = stepThemes[current]!;

  const goNext = useCallback(() => {
    if (!isLast) {
      setDirection(1);
      setCurrent((p) => p + 1);
    } else onClose();
  }, [isLast, onClose]);

  const goPrev = useCallback(() => {
    if (!isFirst) {
      setDirection(-1);
      setCurrent((p) => p - 1);
    }
  }, [isFirst]);

  const goTo = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= steps.length) return;
      setDirection(idx > current ? 1 : -1);
      setCurrent(idx);
    },
    [current, steps.length],
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev();
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [goNext, goPrev, onClose]);

  const slide = {
    enter: (d: number) => ({ x: d > 0 ? 18 : -18, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -18 : 18, opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-[#0a0a0f]/55 backdrop-blur-[6px] dark:bg-black/60"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.32, 0.72, 0, 1] }}
        className="border-border/20 bg-background relative flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[24px] border shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:max-h-[88vh]"
      >
        {/* Header: editorial masthead */}
        <div className="border-border/10 flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="bg-foreground text-background flex h-7 w-7 items-center justify-center rounded-lg">
                <span className="text-[11px] font-bold tracking-tight">A</span>
              </div>
              <span className="text-[13px] font-semibold tracking-tight">ArunaOS</span>
              <span className="bg-muted text-foreground/50 hidden rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline">
                Tour
              </span>
            </div>
            <span className="bg-border/30 hidden h-4 w-px sm:block" />
            <span className="text-foreground/50 hidden text-xs sm:inline">{step.kicker}</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
              className="text-foreground/50 hover:text-foreground hover:bg-muted flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
            >
              <Globe size={12} />
              {lang === 'id' ? 'EN' : 'ID'}
            </button>
            <span className="text-foreground/40 hidden font-mono text-xs tabular-nums sm:inline">
              {String(current + 1).padStart(2, '0')} / 09
            </span>
            <button
              onClick={onClose}
              className="text-foreground/40 hover:text-foreground hover:bg-muted rounded-full p-1.5 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Progress hairline */}
        <div className="bg-border/20 h-px">
          <motion.div
            className="bg-foreground h-px"
            initial={false}
            animate={{ width: `${((current + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
          />
        </div>

        {/* Body — single column, full-width readable layout */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Chapter rail — horizontal, scrollable */}
          <div className="border-border/10 bg-muted/[0.18] scrollbar-none flex shrink-0 items-center gap-1 overflow-x-auto border-b px-2 py-2 sm:px-3">
            {steps.map((s, i) => {
              const ActiveIcon = stepIcons[i]!;
              const active = i === current;
              const done = i < current;
              return (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-all',
                    active
                      ? 'bg-foreground text-background border-foreground shadow-sm'
                      : done
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'bg-card border-border/20 text-foreground/45 hover:text-foreground/70 hover:bg-card',
                  )}
                >
                  <span className="flex h-4 w-4 items-center justify-center">
                    {done ? '✓' : <ActiveIcon size={11} />}
                  </span>
                  <span className="hidden sm:inline">{s.kicker}</span>
                  <span className="sm:hidden">{String(i + 1).padStart(2, '0')}</span>
                </button>
              );
            })}
          </div>

          {/* Visual — full width banner */}
          <div className="bg-muted/20 relative flex h-[190px] shrink-0 items-center justify-center overflow-hidden sm:h-[220px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={`wash-${current}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className={cn(
                  'absolute inset-0 bg-gradient-to-br opacity-[0.85]',
                  theme.from,
                  theme.via,
                  'to-transparent',
                )}
              />
            </AnimatePresence>
            <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:20px_20px]" />
            <div className="text-foreground/[0.04] pointer-events-none absolute bottom-1 right-3 select-none font-mono text-[56px] font-bold leading-none tracking-tighter sm:text-[72px]">
              0{current + 1}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={`vis-${current}`}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
                className="relative h-full w-full max-w-[520px]"
              >
                <Visual index={current} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Content — readable, centered, high contrast */}
          <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
            <div className="mx-auto max-w-[60ch] px-5 py-6 sm:px-8 sm:py-7">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={`content-${current}-${lang}`}
                  custom={direction}
                  variants={slide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                  className="space-y-5"
                >
                  {/* kicker */}
                  <div className="flex items-center gap-2">
                    <span className={cn('h-px w-6', theme.blob)} />
                    <span className="text-foreground/35 text-[11px] font-semibold uppercase tracking-[0.14em]">
                      {step.kicker}
                    </span>
                  </div>

                  {/* title editorial — high contrast, readable */}
                  <div className="min-w-0">
                    <h2 className="text-foreground whitespace-pre-line break-words text-[26px] font-bold leading-[1.05] tracking-[-0.02em] sm:text-[30px]">
                      {step.title}
                    </h2>
                    <p
                      className={cn(
                        'mt-3 inline-flex max-w-full items-center gap-2 break-words rounded-full border px-3 py-1.5 text-[13px] font-medium',
                        theme.ring,
                        'bg-card border',
                      )}
                    >
                      <Icon size={13} className={cn('shrink-0', theme.accent)} />
                      <span className="text-foreground/80 min-w-0 break-words font-medium">
                        {step.subtitle}
                      </span>
                    </p>
                  </div>

                  <div className="text-foreground/85 min-w-0 space-y-3.5 break-words text-[15px] font-[450] leading-[1.75]">
                    {step.body.map((p, i) => (
                      <p key={i} className="break-words [overflow-wrap:anywhere]">
                        {p}
                      </p>
                    ))}
                  </div>

                  {step.tips && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.08] p-4 dark:bg-amber-500/[0.06]">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                        <Sparkles size={12} />
                        Tips untuk kamu
                      </div>
                      <ul className="mt-2.5 grid gap-2">
                        {step.tips.map((t, i) => (
                          <li
                            key={i}
                            className="text-foreground/75 flex items-start gap-2.5 text-[14px] leading-relaxed"
                          >
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Footer — sticky */}
          <div className="border-border/10 bg-muted/10 flex shrink-0 items-center justify-between border-t px-4 py-3 sm:px-6">
            {/* dots — show on mobile only now, desktop has rail */}
            <div className="flex items-center gap-1 sm:hidden">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === current ? 'bg-foreground w-6' : 'bg-foreground/20 w-1.5',
                  )}
                  aria-label={`Step ${i + 1}`}
                />
              ))}
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <span className="text-foreground/50 text-xs">
                {current + 1} dari {steps.length}
              </span>
              <span className="bg-border/30 h-3 w-px" />
              <span className="text-foreground/50 hidden text-xs sm:inline">Esc untuk tutup</span>
            </div>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={goPrev}
                  className="text-foreground/60 hover:text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-colors"
                >
                  <ArrowLeft size={14} />
                  Kembali
                </button>
              )}
              <button
                onClick={goNext}
                className="bg-foreground text-background hover:bg-foreground/90 inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-semibold shadow-sm transition-colors"
              >
                {isLast
                  ? lang === 'id'
                    ? 'Mulai Jelajah'
                    : 'Start Exploring'
                  : lang === 'id'
                    ? 'Lanjut'
                    : 'Next'}
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
