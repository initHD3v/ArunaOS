'use client';

import { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, CalendarDays } from 'lucide-react';

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

interface HolidayInfo {
  name: string;
  type: 'national' | 'cuti';
  category: 'keagamaan' | 'nasional' | 'budaya';
  description: string;
}

const HOLIDAYS_2026: Record<string, HolidayInfo[]> = {
  '2026-01-01': [
    {
      name: 'Tahun Baru 2026 Masehi',
      type: 'national',
      category: 'nasional',
      description:
        'Perayaan pergantian tahun Masehi yang dirayakan secara global. Di Indonesia, momen ini biasanya diisi dengan berkumpul keluarga, pesta kembang api, dan refleksi akhir tahun.',
    },
  ],
  '2026-01-16': [
    {
      name: 'Isra Mikraj Nabi Muhammad SAW',
      type: 'national',
      category: 'keagamaan',
      description:
        'Memperingati perjalanan Nabi Muhammad SAW dari Masjidil Haram ke Masjidil Aqsa (Isra), lalu naik ke Sidratul Muntaha (Mikraj) untuk menerima perintah salat. Umat Islam memeringatinya dengan pengajian dan ceramah keagamaan.',
    },
  ],
  '2026-02-17': [
    {
      name: 'Tahun Baru Imlek 2577 Kongzili',
      type: 'national',
      category: 'budaya',
      description:
        'Tahun Baru Imlek merupakan perayaan terpenting bagi masyarakat Tionghoa. Tahun 2026 adalah Tahun Kuda Api. Dirayakan dengan sembahyang, bagi-bagi angpao, dan berkumpul bersama keluarga.',
    },
  ],
  '2026-02-16': [
    {
      name: 'Cuti Bersama Imlek 2577',
      type: 'cuti',
      category: 'budaya',
      description:
        'Cuti bersama untuk memperpanjang libur perayaan Tahun Baru Imlek. Memberikan kesempatan lebih bagi masyarakat untuk merayakan bersama keluarga.',
    },
  ],
  '2026-03-19': [
    {
      name: 'Hari Suci Nyepi (Tahun Baru Saka 1948)',
      type: 'national',
      category: 'keagamaan',
      description:
        'Tahun Baru Hindu Saka dirayakan dengan berdiam diri di rumah (Catur Brata Penyepian): tidak bekerja, tidak bepergian, tidak menyalakan api, dan tidak bersenang-senang. Di Bali, seluruh pulau tutup total, bahkan bandara tidak beroperasi.',
    },
  ],
  '2026-03-18': [
    {
      name: 'Cuti Bersama Nyepi',
      type: 'cuti',
      category: 'keagamaan',
      description:
        'Cuti bersama menjelang Hari Suci Nyepi untuk memberi waktu persiapan dan perayaan bagi umat Hindu.',
    },
  ],
  '2026-03-21': [
    {
      name: 'Idul Fitri 1447 H (Hari ke-1)',
      type: 'national',
      category: 'keagamaan',
      description:
        'Hari kemenangan umat Islam setelah sebulan berpuasa Ramadan. Dirayakan dengan salat Id, halal bihalal, maaf-memaafan, dan berkumpul bersama keluarga. Identik dengan ketupat, opor, dan mudik.',
    },
  ],
  '2026-03-22': [
    {
      name: 'Idul Fitri 1447 H (Hari ke-2)',
      type: 'national',
      category: 'keagamaan',
      description:
        'Hari kedua perayaan Idul Fitri. Masih suasana silaturahmi dan kunjungan ke sanak keluarga. Banyak tempat wisata mulai ramai dikunjungi.',
    },
  ],
  '2026-03-20': [
    {
      name: 'Cuti Bersama Idul Fitri',
      type: 'cuti',
      category: 'keagamaan',
      description:
        'Cuti bersama menjelang Idul Fitri untuk memberi waktu mudik dan persiapan perayaan.',
    },
  ],
  '2026-03-23': [
    {
      name: 'Cuti Bersama Idul Fitri',
      type: 'cuti',
      category: 'keagamaan',
      description: 'Cuti bersama setelah Idul Fitri untuk memperpanjang momen berkumpul keluarga.',
    },
  ],
  '2026-03-24': [
    {
      name: 'Cuti Bersama Idul Fitri',
      type: 'cuti',
      category: 'keagamaan',
      description: 'Perpanjangan cuti bersama Idul Fitri agar libur lebih panjang.',
    },
  ],
  '2026-04-03': [
    {
      name: 'Wafat Isa Almasih',
      type: 'national',
      category: 'keagamaan',
      description:
        'Memperingati wafatnya Yesus Kristus yang disalib. Umat Kristiani merayakannya dengan ibadah Jumat Agung, merenungkan pengorbanan Yesus.',
    },
  ],
  '2026-04-05': [
    {
      name: 'Kebangkitan Yesus Kristus (Paskah)',
      type: 'national',
      category: 'keagamaan',
      description:
        'Hari Raya Paskah memperingati kebangkitan Yesus Kristus dari kematian. Umat Kristiani merayakan dengan ibadah minggu Paskah, telur paskah, dan berkumpul keluarga.',
    },
  ],
  '2026-05-01': [
    {
      name: 'Hari Buruh Internasional',
      type: 'national',
      category: 'nasional',
      description:
        'May Day — peringatan perjuangan kelas buruh di seluruh dunia. Di Indonesia, dirayakan dengan demonstrasi damai oleh serikat buruh maupun libur bersama.',
    },
  ],
  '2026-05-14': [
    {
      name: 'Kenaikan Isa Almasih',
      type: 'national',
      category: 'keagamaan',
      description:
        'Memperingati kenaikan Yesus Kristus ke surga, 40 hari setelah Paskah. Umat Kristiani merayakan dengan ibadah di gereja.',
    },
  ],
  '2026-05-15': [
    {
      name: 'Cuti Bersama Kenaikan Isa Almasih',
      type: 'cuti',
      category: 'keagamaan',
      description: 'Cuti bersama untuk memperpanjang libur Kenaikan Isa Almasih.',
    },
  ],
  '2026-05-27': [
    {
      name: 'Idul Adha 1447 H',
      type: 'national',
      category: 'keagamaan',
      description:
        'Hari Raya Kurban — memperingati ketaatan Nabi Ibrahim AS yang rela mengorbankan putranya. Umat Islam melaksanakan salat Id dan penyembelihan hewan kurban (sapi, kambing) untuk dibagikan kepada yang membutuhkan.',
    },
  ],
  '2026-05-28': [
    {
      name: 'Cuti Bersama Idul Adha',
      type: 'cuti',
      category: 'keagamaan',
      description: 'Cuti bersama untuk memperpanjang libur Idul Adha.',
    },
  ],
  '2026-05-31': [
    {
      name: 'Hari Raya Waisak 2570 BE',
      type: 'national',
      category: 'keagamaan',
      description:
        'Hari suci umat Buddha memperingati kelahiran, pencerahan, dan wafatnya Siddharta Gautama. Dirayakan dengan meditasi, puja bakti, dan ritual di vihara-vihara, terutama di Candi Borobudur.',
    },
  ],
  '2026-06-01': [
    {
      name: 'Hari Lahir Pancasila',
      type: 'national',
      category: 'nasional',
      description:
        'Memperingati pidato Bung Karno pada 1 Juni 1945 yang merumuskan Pancasila sebagai dasar negara. Dirayakan dengan upacara bendera dan kegiatan kebangsaan.',
    },
  ],
  '2026-06-16': [
    {
      name: 'Tahun Baru Islam 1448 H',
      type: 'national',
      category: 'keagamaan',
      description:
        '1 Muharram — tahun baru dalam kalender Hijriah. Umat Islam memeringatinya dengan pengajian dan doa bersama menyambut tahun baru Islam.',
    },
  ],
  '2026-08-17': [
    {
      name: 'Hari Kemerdekaan RI',
      type: 'national',
      category: 'nasional',
      description:
        'Proklamasi Kemerdekaan Indonesia 17 Agustus 1945. Dirayakan meriah di seluruh Indonesia dengan upacara bendera, lomba-lomba tradisional, dan berbagai kegiatan patriotik.',
    },
  ],
  '2026-08-25': [
    {
      name: 'Maulid Nabi Muhammad SAW',
      type: 'national',
      category: 'keagamaan',
      description:
        'Memperingati kelahiran Nabi Muhammad SAW. Umat Islam merayakan dengan pembacaan shalawat, pengajian, dan ceramah tentang keteladanan Nabi.',
    },
  ],
  '2026-12-24': [
    {
      name: 'Cuti Bersama Natal',
      type: 'cuti',
      category: 'keagamaan',
      description:
        'Cuti bersama untuk memberi waktu persiapan dan perayaan Natal bagi umat Kristiani.',
    },
  ],
  '2026-12-25': [
    {
      name: 'Hari Raya Natal',
      type: 'national',
      category: 'keagamaan',
      description:
        'Memperingati kelahiran Yesus Kristus. Umat Kristiani merayakan dengan ibadah malam Natal dan misa pagi, pohon Natal, tukar kado, dan berkumpul keluarga.',
    },
  ],
};

function getHolidays(date: Date) {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return HOLIDAYS_2026[key] ?? null;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMonthHolidays(year: number, month: number) {
  const results: { date: number; holiday: HolidayInfo }[] = [];
  for (const [key, holidays] of Object.entries(HOLIDAYS_2026)) {
    const d = new Date(key);
    if (d.getFullYear() === year && d.getMonth() === month) {
      for (const h of holidays) {
        results.push({ date: d.getDate(), holiday: h });
      }
    }
  }
  return results.sort((a, b) => a.date - b.date);
}

const CATEGORY_COLORS = {
  keagamaan: { dot: 'bg-violet-400/60', badge: 'bg-violet-500/10 text-violet-400' },
  nasional: { dot: 'bg-red-400/60', badge: 'bg-red-500/10 text-red-400' },
  budaya: { dot: 'bg-amber-400/60', badge: 'bg-amber-500/10 text-amber-400' },
} as const;

const CATEGORY_LABELS = {
  keagamaan: 'Keagamaan',
  nasional: 'Nasional',
  budaya: 'Budaya',
} as const;

interface CalendarPopupProps {
  date: Date;
}

export function CalendarPopup({ date }: CalendarPopupProps) {
  const today = date;
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const goPrevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
    setExpandedEvent(null);
  }, [viewMonth]);

  const goNextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
    setExpandedEvent(null);
  }, [viewMonth]);

  const goToday = useCallback(() => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setExpandedEvent(null);
  }, [today]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDay = new Date(viewYear, viewMonth, 1).getDay();

  const todayHolidays = getHolidays(today);
  const monthHolidays = useMemo(() => getMonthHolidays(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('id-ID', { month: 'long' });
  const dayName = today.toLocaleDateString('id-ID', { weekday: 'long' });
  const timeStr = today.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.96 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onClick={(e) => e.stopPropagation()}
      className="border-border/30 bg-background absolute right-0 top-full z-[9999] mt-1 w-80 origin-top-right overflow-hidden rounded-xl border shadow-2xl backdrop-blur-2xl"
    >
      {/* Today header */}
      <div className="flex flex-col items-center gap-0.5 bg-gradient-to-b from-violet-500/10 via-fuchsia-500/5 to-transparent px-5 pb-3 pt-5">
        <span className="text-foreground/40 text-xs">{dayName}</span>
        <span className="text-foreground text-3xl font-light tracking-tight">
          {today.getDate()}
        </span>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-foreground/60 text-sm">
            {today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </span>
          <span className="text-foreground/30 text-xs">·</span>
          <span className="text-foreground/50 text-xs font-medium tabular-nums">{timeStr}</span>
        </div>

        {todayHolidays && (
          <div className="mt-1.5 flex flex-col items-center gap-0.5">
            {todayHolidays.map((h, i) => (
              <span
                key={i}
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-medium',
                  CATEGORY_COLORS[h.category].badge,
                )}
              >
                {h.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Month/Year navigation */}
      <div className="flex items-center justify-between px-4 pb-1 pt-3">
        <button
          onClick={goPrevMonth}
          className="text-foreground/30 hover:text-foreground/60 rounded-md p-1 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          onClick={goToday}
          className={cn(
            'flex items-baseline gap-1.5 rounded-md px-2 py-0.5 transition-colors',
            isCurrentMonth
              ? 'text-foreground/40 cursor-default'
              : 'text-foreground/60 hover:text-foreground hover:bg-muted/50',
          )}
        >
          <span className="text-foreground/80 text-sm font-semibold">{monthName}</span>
          <span className="text-foreground/50 text-sm font-medium">{viewYear}</span>
        </button>

        <button
          onClick={goNextMonth}
          className="text-foreground/30 hover:text-foreground/60 rounded-md p-1 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="px-4 pb-2">
        <div className="grid grid-cols-7 gap-px">
          {DAYS.map((d) => (
            <div
              key={d}
              className="text-foreground/30 flex items-center justify-center py-1 text-[11px] font-medium"
            >
              {d}
            </div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={`e-${i}`} />;

            const cellDate = new Date(viewYear, viewMonth, d);
            const isToday = isSameDay(cellDate, today);
            const holiday = getHolidays(cellDate);

            return (
              <div key={d} className="relative flex items-center justify-center py-0.5">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors',
                    isToday
                      ? 'bg-foreground/80 text-background font-medium'
                      : holiday
                        ? 'text-foreground/60'
                        : 'text-foreground/50 hover:bg-muted/60',
                  )}
                >
                  {d}
                </div>
                {holiday && !isToday && (
                  <div
                    className={cn(
                      'absolute bottom-0.5 h-1 w-1 rounded-full',
                      CATEGORY_COLORS[holiday[0]!.category].dot,
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Holidays list */}
      {monthHolidays.length > 0 && (
        <div className="border-border/10 border-t px-4 py-3">
          <p className="text-foreground/30 mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider">
            <CalendarDays size={11} />
            {monthHolidays.length} event — {monthName.toLowerCase()} {viewYear}
          </p>
          <div className="space-y-1">
            {monthHolidays.map((item) => {
              const h = item.holiday;
              const cellDate = new Date(viewYear, viewMonth, item.date);
              const dayOfWeek = cellDate.toLocaleDateString('id-ID', { weekday: 'short' });
              const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(item.date).padStart(2, '0')}-${h.name}`;
              const isExpanded = expandedEvent === key;

              return (
                <div key={key}>
                  <button
                    onClick={() => setExpandedEvent(isExpanded ? null : key)}
                    className="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          'h-1.5 w-1.5 shrink-0 rounded-full',
                          CATEGORY_COLORS[h.category].dot,
                        )}
                      />
                      <span className="text-foreground/50 truncate text-xs">{h.name}</span>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                          CATEGORY_COLORS[h.category].badge,
                        )}
                      >
                        {CATEGORY_LABELS[h.category]}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-foreground/30 text-[11px] tabular-nums">
                        {item.date} {dayOfWeek}
                      </span>
                      {isExpanded ? (
                        <ChevronUp size={12} className="text-foreground/30" />
                      ) : (
                        <ChevronDown size={12} className="text-foreground/20" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="border-border/10 ml-[13px] border-l-2 pb-1.5 pl-4 pt-0.5">
                          <div className="mb-1 flex items-center gap-1.5">
                            <span
                              className={cn(
                                'text-[10px] font-medium',
                                h.type === 'national' ? 'text-red-400' : 'text-amber-400',
                              )}
                            >
                              {h.type === 'national' ? 'Libur Nasional' : 'Cuti Bersama'}
                            </span>
                          </div>
                          <p className="text-foreground/40 text-[11px] leading-relaxed">
                            {h.description}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
