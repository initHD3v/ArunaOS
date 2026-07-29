export interface HolidayInfo {
  name: string;
  type: 'national' | 'cuti';
  category: 'keagamaan' | 'nasional' | 'budaya';
  description: string;
}

export const HOLIDAYS_2026: Record<string, HolidayInfo[]> = {
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
  '2026-02-16': [
    {
      name: 'Cuti Bersama Imlek 2577',
      type: 'cuti',
      category: 'budaya',
      description:
        'Cuti bersama untuk memperpanjang libur perayaan Tahun Baru Imlek. Memberikan kesempatan lebih bagi masyarakat untuk merayakan bersama keluarga.',
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
  '2026-03-18': [
    {
      name: 'Cuti Bersama Nyepi',
      type: 'cuti',
      category: 'keagamaan',
      description:
        'Cuti bersama menjelang Hari Suci Nyepi untuk memberi waktu persiapan dan perayaan bagi umat Hindu.',
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
  '2026-03-20': [
    {
      name: 'Cuti Bersama Idul Fitri',
      type: 'cuti',
      category: 'keagamaan',
      description:
        'Cuti bersama menjelang Idul Fitri untuk memberi waktu mudik dan persiapan perayaan.',
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
