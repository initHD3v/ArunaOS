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
} from 'lucide-react';

type Lang = 'id' | 'en';

interface TourContent {
  title: string;
  subtitle: string;
  body: string[];
  tips?: string[];
}

const content = {
  id: [
    {
      title: 'Halo, Selamat Datang!',
      subtitle: 'Ruang kerja pintar yang ngerti kamu',
      body: [
        'ArunaOS itu lingkungan kerja yang jalan di browser — beda dari OS pada umumnya. Di sini, semuanya dirancang biar interaksi kamu sama komputer terasa lebih alami.',
        'Mau buka file, ganti wallpaper, atau cari sesuatu? Semua bisa dilakukan dengan cepat, tanpa ribet. Langsung aja jelajah, atau ikut tur singkat ini biar lebih familiar.',
      ],
    },
    {
      title: 'Desktop',
      subtitle: 'Lapak kerja utama kamu',
      body: [
        'Desktop adalah tempat kamu memulai semuanya. Klik kanan di area kosong buat lihat menu cepat — ganti wallpaper, buka terminal, atau akses pengaturan.',
        'Desktop juga bisa kamu personalisasi dengan berbagai wallpaper keren. Pilih dari koleksi gradien atau upload gambar sendiri.',
      ],
      tips: [
        'Klik kanan di desktop → Ganti Wallpaper',
        'Coba berbagai tema di Settings > Appearance',
      ],
    },
    {
      title: 'Dock',
      subtitle: 'Peluncur aplikasi andalan',
      body: [
        'Dock itu deretan ikon di bagian bawah layar. Klik sekali, aplikasi langsung kebuka atau kebawa ke depan. Lagi ada aplikasi jalan? Ada indikator titik kecil di bawah ikonnya.',
        'Seret ikon buat ngatur ulang urutan sesuai favorit kamu. Klik kanan buat opsi tambahan.',
      ],
      tips: ['Klik ikon buat buka atau fokuskan aplikasi', 'Seret buat atur ulang posisi'],
    },
    {
      title: 'Menu Bar',
      subtitle: 'Kontrol sistem dalam satu baris',
      body: [
        'Di bagian paling atas ada Menu Bar. Logo Aruna di kiri — klik buat akses About, Restart, atau Shutdown.',
        'Sisi kanan ada indikator sistem kayak jam, status jaringan, dan toggle cepat. Semua info penting dalam jangkauan.',
      ],
      tips: ['Klik logo Aruna buat menu sistem (Restart, Shutdown, dll)'],
    },
    {
      title: 'Window Manager',
      subtitle: 'Atur jendela dengan bebas',
      body: [
        'Setiap aplikasi jalan di jendelanya sendiri. Geser title bar buat mindahin posisi, tarik ujung atau sudut buat ubah ukuran.',
        'Tombol traffic light (merah/kuning/hijau) buat nutup, minimize, atau maximize. Mau ganti jendela? Pake Ctrl+] atau Ctrl+[.',
      ],
      tips: [
        'Ctrl+] — Jendela berikutnya',
        'Ctrl+[ — Jendela sebelumnya',
        'Cmd+W — Tutup jendela yang sedang aktif',
        'Seret pinggir jendela buat ubah ukuran',
      ],
    },
    {
      title: 'Pengaturan',
      subtitle: 'Biar makin cocok sama kamu',
      body: [
        'Buka Settings buat ubah tema (Light, Dark, System, AMOLED, atau High Contrast), pilih wallpaper favorit dari koleksi gradien, upload gambar sendiri, atur shortcut keyboard, atau aktifkan password biar lebih aman.',
        'Semua pengaturan ada di satu tempat, tinggal pilih dan rasain bedanya.',
      ],
      tips: [
        'Cmd+K — Buka Command Palette buat cari pengaturan apapun',
        'Coba tema High Contrast buat aksesibilitas lebih baik',
      ],
    },
    {
      title: 'Pintasan Keyboard',
      subtitle: 'Naik level pake keyboard',
      body: [
        'Biar makin cepet, beberapa pintasan ini bakal jadi andalan kamu. Dijamin bikin navigasi sehari-hari jauh lebih efisien.',
      ],
      tips: [
        'Cmd+K — Command Palette',
        'Ctrl+] — Fokus jendela berikutnya',
        'Ctrl+[ — Fokus jendela sebelumnya',
        'Cmd+W — Tutup jendela',
        'Cmd+Shift+M — Module DevTools',
        'Escape — Tutup overlay / restore jendela',
      ],
    },
    {
      title: 'Sistem Module',
      subtitle: 'Aplikasi siap pakai, tinggal pencet',
      body: [
        'ArunaOS punya arsitektur modular. Setiap aplikasi jalan di sandbox sendiri dengan izin yang terpisah — jadi lebih aman dan terkelola.',
        'Built-in apps kayak Files, Settings, AStat (monitor sistem), dan Camera udah siap pakai. Mau liat detail teknisnya? Buka Module DevTools pake Cmd+Shift+M.',
      ],
      tips: ['Cmd+Shift+M — Buka Module DevTools buat inspeksi module'],
    },
    {
      title: 'Siap Mulai?',
      subtitle: 'Gas aja dulu!',
      body: [
        'Gak perlu baca manual — langsung coba aja. Buka Settings, atur tema favorit. Buka Files, lihat-lihat file. Pencet Cmd+K, cari perintah yang kamu butuhin.',
        'ArunaOS dirancang buat dieksplor. Jadi jangan takut buat klik-klik dan nemuin hal baru sendiri. Selamat mencoba!',
      ],
    },
  ],
  en: [
    {
      title: 'Hello, Welcome!',
      subtitle: 'A smart workspace that gets you',
      body: [
        'ArunaOS is a browser-based operating environment — different from a regular OS. Everything is designed to make your interaction with the computer feel more natural.',
        "Want to open a file, change the wallpaper, or search for something? It's all quick and easy. Start exploring, or follow this short tour to get familiar.",
      ],
    },
    {
      title: 'Desktop',
      subtitle: 'Your main workspace',
      body: [
        'The desktop is where everything begins. Right-click on an empty area to see the quick menu — change wallpaper, open terminal, or access settings.',
        'You can personalize the desktop with various wallpapers. Pick from gradient collections or upload your own image.',
      ],
      tips: [
        'Right-click on desktop → Change Wallpaper',
        'Try different themes in Settings > Appearance',
      ],
    },
    {
      title: 'Dock',
      subtitle: 'Your app launcher',
      body: [
        'The Dock sits at the bottom of the screen. One click and an app opens or comes to front. Running apps show a small indicator dot below their icon.',
        'Drag icons to rearrange them. Right-click for additional options.',
      ],
      tips: ['Click an icon to open or focus an app', 'Drag to rearrange the Dock'],
    },
    {
      title: 'Menu Bar',
      subtitle: 'System controls at a glance',
      body: [
        'The Menu Bar at the top gives you access to everything. The Aruna logo on the left — click for About, Restart, or Shutdown.',
        'The right side shows system indicators like the clock, network status, and quick toggles.',
      ],
      tips: ['Click the Aruna logo for the system menu (Restart, Shutdown, etc.)'],
    },
    {
      title: 'Window Manager',
      subtitle: 'Freedom to arrange',
      body: [
        'Every app lives in its own window. Drag the title bar to move, pull edges or corners to resize. Traffic light buttons (red/yellow/green) close, minimize, or maximize.',
        'Switching windows? Use Ctrl+] or Ctrl+[.',
      ],
      tips: [
        'Ctrl+] — Next window',
        'Ctrl+[ — Previous window',
        'Cmd+W — Close active window',
        'Drag window edges to resize',
      ],
    },
    {
      title: 'Settings',
      subtitle: 'Make it yours',
      body: [
        'Open Settings to change themes (Light, Dark, System, AMOLED, or High Contrast), pick a favorite wallpaper, upload a custom image, configure shortcuts, or enable password protection.',
        'Everything is in one place — just choose and feel the difference.',
      ],
      tips: [
        'Cmd+K — Open Command Palette to find any setting',
        'Try High Contrast theme for better accessibility',
      ],
    },
    {
      title: 'Keyboard Shortcuts',
      subtitle: 'Level up with your keyboard',
      body: [
        "Learn a few shortcuts and you'll navigate ArunaOS without touching the mouse. These will save you a ton of time.",
      ],
      tips: [
        'Cmd+K — Command Palette',
        'Ctrl+] — Focus next window',
        'Ctrl+[ — Focus previous window',
        'Cmd+W — Close window',
        'Cmd+Shift+M — Module DevTools',
        'Escape — Close overlay / restore window',
      ],
    },
    {
      title: 'Module System',
      subtitle: 'Apps ready to go',
      body: [
        'ArunaOS has a modular architecture. Each app runs in its own sandbox with separate permissions — safer and better managed.',
        'Built-in apps like Files, Settings, AStat (system monitor), and Camera are ready to use. For technical details, open Module DevTools with Cmd+Shift+M.',
      ],
      tips: ['Cmd+Shift+M — Open Module DevTools to inspect modules'],
    },
    {
      title: 'Ready to Start?',
      subtitle: 'Go for it!',
      body: [
        'No manual needed — just dive in. Open Settings, pick your favorite theme. Open Files, browse around. Press Cmd+K and search for any command.',
        "ArunaOS is built to be explored. So don't be afraid to click around and discover things yourself. Enjoy!",
      ],
    },
  ],
} satisfies Record<Lang, TourContent[]>;

const stepColors = [
  'from-violet-500/40 via-fuchsia-500/20 to-transparent',
  'from-emerald-500/40 via-teal-500/20 to-transparent',
  'from-blue-500/40 via-sky-500/20 to-transparent',
  'from-amber-500/40 via-orange-500/20 to-transparent',
  'from-rose-500/40 via-pink-500/20 to-transparent',
  'from-purple-500/40 via-violet-500/20 to-transparent',
  'from-cyan-500/40 via-sky-500/20 to-transparent',
  'from-fuchsia-500/40 via-pink-500/20 to-transparent',
  'from-indigo-500/40 via-violet-500/20 to-transparent',
];

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
  const color = stepColors[current]!;

  const goNext = useCallback(() => {
    if (!isLast) {
      setDirection(1);
      setCurrent((p) => p + 1);
    }
  }, [isLast]);

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
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev();
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, onClose]);

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 400 : -400, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -200 : 200, opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="border-border/40 bg-background relative flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-2xl shadow-black/10"
      >
        {/* Top bar */}
        <div className="border-border/10 flex items-center justify-between border-b px-5 py-3">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all',
              'text-foreground/50 hover:text-foreground hover:bg-muted/60',
            )}
          >
            <Globe size={13} />
            {lang === 'id' ? 'EN' : 'ID'}
          </button>

          {/* Step counter */}
          <div className="text-foreground/30 text-xs font-medium tabular-nums">
            {String(current + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="text-foreground/40 hover:text-foreground/80 hover:bg-muted/60 rounded-lg p-1.5 transition-colors"
            aria-label="Close tour"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress */}
        <div className="bg-border/20 h-[3px]">
          <motion.div
            className="bg-foreground/40 h-full"
            initial={false}
            animate={{ width: `${((current + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        </div>

        {/* Main content area */}
        <div className="flex flex-col-reverse sm:flex-row">
          {/* Left: decorative panel */}
          {/*
            Use a stable key derived from current so we can animate it independently.
            The AnimatePresence below handles crossfade inside the decorative area.
          */}
          <div
            className={cn(
              'relative flex h-48 shrink-0 items-center justify-center overflow-hidden sm:h-auto sm:w-[280px] lg:w-[320px]',
              'bg-muted/30',
            )}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`bg-${current}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className={cn('absolute inset-0 bg-gradient-to-br', color)}
              />
            </AnimatePresence>

            {/* Decorative dots */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
              <div className="h-full w-full bg-[radial-gradient(circle_at_30%_40%,white_1px,transparent_1px)] bg-[length:24px_24px]" />
            </div>

            {/* Icon */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`icon-${current}`}
                initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.6, opacity: 0, rotate: 8 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="relative"
              >
                <div className="bg-foreground/5 absolute inset-0 rounded-2xl blur-2xl" />
                <div className="bg-background/60 ring-border/20 relative flex h-20 w-20 items-center justify-center rounded-2xl ring-1 backdrop-blur-sm">
                  <Icon size={36} className="text-foreground/70" />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: content */}
          <div className="flex min-h-0 flex-1 flex-col px-6 py-6 sm:px-8 sm:py-8">
            <div className="flex-1">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={`content-${current}-${lang}`}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-5"
                >
                  {/* Title */}
                  <div>
                    <h2 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
                      {step.title}
                    </h2>
                    <p className="text-foreground/40 mt-1 text-sm">{step.subtitle}</p>
                  </div>

                  {/* Body */}
                  <div className="text-foreground/60 space-y-3 text-sm leading-relaxed sm:text-[15px]">
                    {step.body.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>

                  {/* Tips */}
                  {step.tips && step.tips.length > 0 && (
                    <div className="space-y-1.5 rounded-xl border border-amber-500/15 bg-amber-500/5 px-4 py-3">
                      <p className="text-foreground/40 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider">
                        <Sparkles size={12} />
                        {lang === 'id' ? 'Tips' : 'Tips'}
                      </p>
                      <ul className="space-y-1">
                        {step.tips.map((tip, i) => (
                          <li
                            key={i}
                            className="text-foreground/50 flex items-start gap-2 text-xs sm:text-sm"
                          >
                            <span className="mt-1.5 block h-1 w-1 shrink-0 rounded-full bg-amber-400/50" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-border/10 flex items-center justify-between border-t px-5 py-4 sm:px-8">
          {/* Dot nav */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={cn(
                  'rounded-full transition-all duration-300',
                  i === current
                    ? 'bg-foreground/60 h-2 w-6'
                    : 'bg-foreground/15 hover:bg-foreground/30 h-2 w-2',
                )}
                aria-label={`${lang === 'id' ? 'Langkah' : 'Step'} ${i + 1}`}
              />
            ))}
          </div>

          {/* Nav buttons */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={goPrev}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:px-4',
                  'text-foreground/50 hover:text-foreground hover:bg-muted/60',
                )}
              >
                <ArrowLeft size={14} />
                {lang === 'id' ? 'Kembali' : 'Back'}
              </button>
            )}

            {!isLast ? (
              <button
                onClick={goNext}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium text-white transition-all sm:px-5',
                  'bg-foreground/80 hover:bg-foreground',
                )}
              >
                {lang === 'id' ? 'Lanjut' : 'Next'}
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={onClose}
                className={cn(
                  'rounded-lg px-5 py-1.5 text-xs font-medium text-white transition-all',
                  'bg-foreground/80 hover:bg-foreground',
                )}
              >
                {lang === 'id' ? 'Mulai Jelajah' : 'Start Exploring'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
