'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Utensils, Bike, ShoppingBag, ShieldCheck, ArrowRight, Star, 
  TrendingUp, Users, CheckCircle2, MapPin, Zap, Globe, 
  Phone, Clock, Award, Sparkles, Building2, Crown, Store,
  Compass, ChevronRight, Package, Truck, Wallet, Shield,
  Layers, Landmark, HeartHandshake, Check
} from 'lucide-react';
import { UserRole } from '@/types';
import Topography from './Topography';

interface LandingPageProps {
  onEnterApp: (role?: UserRole) => void;
  onOpenAuth: (initialMode?: 'login' | 'register', role?: UserRole) => void;
  storesCount?: number;
  productsCount?: number;
  driversCount?: number;
  ordersCount?: number;
}

// Animated counter hook
function useCountUp(end: number, duration = 1500, startOnView = true) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!startOnView) {
      setCount(end);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true;
          const startTime = Date.now();
          const step = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * end));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration, startOnView]);

  return { count, ref };
}

const STACKED_FEATURES = [
  {
    step: '01',
    badge: 'Pasar & Kuliner',
    badgeColor: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    title: 'Pasar Kuliner & Hasil Tani Pandanwangi',
    tagline: 'Dari Dapur Warga Langsung ke Meja Makan Anda',
    description: 'Nikmati kelezatan Nasi Liwet khas Maleber, Sambal Dadak segar, Beras Pandanwangi asli Cianjur, dan aneka jajanan pasar desa langsung dari tangan pertama petani dan UMKM lokal.',
    icon: Utensils,
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    highlights: [
      '100% Beras & Bahan Baku Segar Lokal',
      'Harga Transparan Tanpa Mark-up Liar',
      'Dukungan Penuh untuk Ibu-Ibu Pelaku UMKM'
    ],
    ctaText: 'Lihat Menu Kuliner',
    role: 'buyer' as const
  },
  {
    step: '02',
    badge: 'Transportasi Desa',
    badgeColor: 'bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border-teal-500/20',
    title: 'Ojek Online & Kurir Cepat Antar Dusun',
    tagline: 'Driver Tetangga Sendiri, Aman & Terpercaya',
    description: 'Antar jemput warga ke stasiun, pasar, sekolah, puskesmas, hingga kirim paket kilat antar dusun. Driver siaga 24 jam di pos desa dengan tarif transparan mulai Rp 3.000/km.',
    icon: Bike,
    iconBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    highlights: [
      'Live GPS Tracking Real-Time di Peta',
      'Driver Terverifikasi Identitas RT/RW Desa',
      'Estimasi Tarif Pasti Sebelum Memesan'
    ],
    ctaText: 'Pesan Ojek Sekarang',
    role: 'buyer' as const
  },
  {
    step: '03',
    badge: 'Sistem Pembayaran',
    badgeColor: 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-500/20',
    title: 'Pembayaran Fleksibel: QRIS & Tunai (COD)',
    tagline: 'Kemudahan Bertransaksi Digital Resmi Midtrans',
    description: 'Bayar instan via scan QRIS (GoPay, OVO, Dana, ShopeePay, BCA, Mandiri) yang diawasi Bank Indonesia atau bayar tunai (COD) langsung ke kurir saat pesanan sampai di tangan Anda.',
    icon: Wallet,
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    highlights: [
      'Konfirmasi Pembayaran Otomatis Detik Itu Juga',
      'Struk & Notifikasi Transaksi Resmi ke WhatsApp',
      'Bebas Pilih: Non-Tunai QRIS atau Tunai COD'
    ],
    ctaText: 'Mulai Transaksi',
    role: 'buyer' as const
  },
  {
    step: '04',
    badge: 'Pemberdayaan Desa',
    badgeColor: 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-500/20',
    title: 'Transparansi Kas & Kemajuan Ekonomi Desa',
    tagline: 'Perputaran Uang Berputar di Dalam Desa Sendiri',
    description: 'Setiap transaksi berkontribusi langsung pada kas pembangunan dan operasional Desa Maleber. Super Admin dan Petugas Desa memantau rekapitulasi keuangan secara terbuka dan akuntabel.',
    icon: Landmark,
    iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    highlights: [
      'Dashboard Rekapitulasi Real-Time Super Admin',
      'Export Laporan Keuangan ke Excel (.xlsx) 1-Klik',
      'Meningkatkan Pendapatan Asli Desa (PADes)'
    ],
    ctaText: 'Masuk Dashboard Admin',
    role: 'admin' as const
  }
];

const TESTIMONIALS = [
  {
    name: 'Teh Rina Maleber',
    role: 'Warga Dusun Manis',
    text: 'Pesan liwet & beras pandanwangi langsung diantar ke depan rumah. Praktis, murah, dan ojeknya tetangga sendiri!',
    rating: 5,
    tag: 'Pembeli Aktif'
  },
  {
    name: 'Kang Asep Supriatna',
    role: 'Mitra Ojek Online Maleber',
    text: 'Orderan transparan dan langsung masuk ke WA. Sangat membantu pendapatan harian warga lokal tanpa biaya potongan yang memberatkan.',
    rating: 5,
    tag: 'Driver Ojek'
  },
  {
    name: 'Ibu Hj. Imas',
    role: 'Pemilik Warung Liwet Maleber',
    text: 'Alhamdulillah pelanggan bertambah dari seluruh dusun. Sistem pesanannya otomatis dan mudah dipelajari oleh pedagang tradisional.',
    rating: 5,
    tag: 'Penjual UMKM'
  }
];

export default function LandingPage({
  onEnterApp,
  onOpenAuth,
  storesCount = 0,
  productsCount = 0,
  driversCount = 0,
  ordersCount = 0
}: LandingPageProps) {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const statsStores = useCountUp(storesCount || 12);
  const statsDrivers = useCountUp(driversCount || 8);
  const statsProducts = useCountUp(productsCount || 24);
  const statsOrders = useCountUp(ordersCount || 150);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-16 sm:space-y-24 pb-20 overflow-hidden">

      {/* ===== HERO SECTION WITH REACT BITS TOPOGRAPHY ===== */}
      <section className="relative min-h-[580px] sm:min-h-[640px] flex items-center justify-center pt-8 pb-16 overflow-hidden rounded-3xl sm:rounded-[40px] mx-2 sm:mx-4 border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-950 shadow-2xl">
        
        {/* React Bits Interactive Topography Background */}
        <div className="absolute inset-0 w-full h-full opacity-65 dark:opacity-75 pointer-events-auto">
          <Topography
            lowColor="#064e3b"
            midColor="#059669"
            highColor="#fbbf24"
            speed={0.25}
            morphAmount={3.2}
            morphSpeed={0.04}
            bands={2.5}
            thickness={0.012}
            scale={1.1}
            pixelSize={1.0}
            glow={0.65}
            colorMode="elevation"
            contrast={3.2}
            brightness={1.1}
            fillBands={false}
            opacity={0.9}
            grain={true}
            grainIntensity={0.04}
            mouseInteraction={true}
            mouseRadius={0.35}
            mouseStrength={0.45}
          />
        </div>

        {/* Ambient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/70 to-zinc-950 pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Hero Content Box */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6 sm:space-y-8 py-10 pointer-events-auto">

          {/* Official Badge Pill */}
          <div className="inline-flex items-center gap-2 bg-emerald-500/15 backdrop-blur-md border border-emerald-400/30 px-4 py-1.5 rounded-full shadow-lg animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-black text-emerald-200 uppercase tracking-widest">
              Digitalisasi Resmi Desa Maleber • Cianjur
            </span>
          </div>

          {/* Main Hero Headline */}
          <div className="space-y-3 max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12]">
              Pasar Digital &amp; Ojek Online{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
                Pemberdayaan Desa
              </span>
            </h1>
            <p className="text-sm sm:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed font-normal">
              Beli kuliner khas Cianjur, beras Pandanwangi asli, kebutuhan harian, hingga pesan antar-jemput ojek desa cepat langsung dari warga untuk warga.
            </p>
          </div>

          {/* Quick Category Action Pills */}
          <div className="flex items-center justify-center flex-wrap gap-2 pt-1 max-w-xl mx-auto">
            {[
              { label: '🍚 Kuliner & Nasi Liwet', role: 'buyer' },
              { label: '🌾 Beras Pandanwangi', role: 'buyer' },
              { label: '🛵 Ojek Desa Kilat', role: 'buyer' },
              { label: '🏪 Warung Sembako', role: 'buyer' }
            ].map((cat, i) => (
              <button
                key={i}
                onClick={() => onEnterApp('buyer')}
                className="bg-white/10 hover:bg-emerald-500/20 backdrop-blur-md border border-white/15 hover:border-emerald-400/50 text-white text-xs font-bold px-3.5 py-1.5 rounded-full transition-all cursor-pointer shadow-sm"
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Hero Action CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2 max-w-md mx-auto">
            <button
              onClick={() => onEnterApp('buyer')}
              className="w-full sm:w-auto flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-sm px-7 py-4 rounded-2xl shadow-xl shadow-emerald-600/40 transition-all flex items-center justify-center gap-2 cursor-pointer group scale-100 hover:scale-[1.02] active:scale-95"
            >
              <ShoppingBag className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
              <span>Belanja Sekarang</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onOpenAuth('login')}
              className="w-full sm:w-auto flex-1 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white font-black text-sm px-6 py-4 rounded-2xl border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg backdrop-blur-md"
            >
              <Crown className="w-4.5 h-4.5 text-amber-400" />
              <span>Masuk Akun</span>
            </button>
          </div>

          {/* Trust Badges */}
          <div className="pt-8 border-t border-white/10 grid grid-cols-3 gap-4 text-center max-w-2xl mx-auto">
            <div className="space-y-0.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-400 block">100% Asli</span>
              <span className="text-[11px] text-zinc-400 font-semibold">Produk Warga Desa</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-xl sm:text-2xl font-black text-teal-400 block">Cepat</span>
              <span className="text-[11px] text-zinc-400 font-semibold">Driver Siaga di Desa</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-xl sm:text-2xl font-black text-amber-400 block">Resmi</span>
              <span className="text-[11px] text-zinc-400 font-semibold">Diawasi Kantor Desa</span>
            </div>
          </div>

        </div>
      </section>

      {/* ===== LIVE REAL-TIME STATS COUNTER SECTION ===== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-zinc-900/90 rounded-3xl p-6 sm:p-10 border border-zinc-200 dark:border-zinc-800 shadow-xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1" ref={statsStores.ref}>
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <Store className="w-5 h-5" />
            </div>
            <h3 className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {statsStores.count}
            </h3>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Warung UMKM</p>
          </div>

          <div className="space-y-1" ref={statsDrivers.ref}>
            <div className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-600 flex items-center justify-center mx-auto mb-2">
              <Bike className="w-5 h-5" />
            </div>
            <h3 className="text-3xl sm:text-4xl font-black text-teal-600 dark:text-teal-400 tabular-nums">
              {statsDrivers.count}
            </h3>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Mitra Driver Ojek</p>
          </div>

          <div className="space-y-1" ref={statsProducts.ref}>
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mx-auto mb-2">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="text-3xl sm:text-4xl font-black text-amber-500 dark:text-amber-400 tabular-nums">
              {statsProducts.count}
            </h3>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Katalog Produk</p>
          </div>

          <div className="space-y-1" ref={statsOrders.ref}>
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center mx-auto mb-2">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
              {statsOrders.count}+
            </h3>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Pesanan Terlayani</p>
          </div>
        </div>
      </section>

      {/* ===== SCROLL STACKED CARDS SECTION (APPLE / LINEAR STYLE) ===== */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/80 px-3.5 py-1.5 rounded-full border border-emerald-500/20 inline-flex items-center gap-1.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            Ekosistem Terintegrasi
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white">
            Layanan Terpadu Warga Maleber
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500">
            Gulir ke bawah untuk melihat bagaimana ekosistem digital memberdayakan ekonomi desa Anda
          </p>
        </div>

        {/* Stacked Cards Container */}
        <div className="relative space-y-6 pb-8">
          {STACKED_FEATURES.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div 
                key={card.step}
                className="sticky top-20 sm:top-24 rounded-3xl p-6 sm:p-9 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xl transition-all hover:border-emerald-500/40"
                style={{
                  zIndex: idx + 1,
                  transform: `translateY(${idx * 4}px)`
                }}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  
                  {/* Left Column Info */}
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`text-[11px] font-black px-3 py-1 rounded-full border ${card.badgeColor}`}>
                        {card.badge}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-zinc-400 dark:text-zinc-500">
                        LANGKAH {card.step}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white leading-snug">
                        {card.title}
                      </h3>
                      <p className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {card.tagline}
                      </p>
                    </div>

                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl">
                      {card.description}
                    </p>

                    {/* Highlights check list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {card.highlights.map((hl, hIdx) => (
                        <div key={hIdx} className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span>{hl}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column Action Card */}
                  <div className="w-full md:w-64 flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 space-y-4 shrink-0 text-center">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-md ${card.iconBg}`}>
                      <Icon className="w-8 h-8" />
                    </div>

                    <button
                      onClick={() => onEnterApp(card.role)}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer group"
                    >
                      <span>{card.ctaText}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== TESTIMONIALS SECTION ===== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-zinc-900 via-emerald-950 to-zinc-950 text-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-emerald-500/30 relative overflow-hidden space-y-8">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="text-center space-y-2 relative z-10">
            <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest bg-emerald-900/60 border border-emerald-500/30 px-3.5 py-1 rounded-full">
              Testimoni Warga Desa
            </span>
            <h2 className="text-2xl sm:text-4xl font-black">Pengalaman Nyata Warga Maleber</h2>
          </div>

          <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10">
            <div className="flex items-center justify-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
              ))}
            </div>

            <p className="text-base sm:text-xl font-medium italic leading-relaxed text-zinc-100">
              &ldquo;{TESTIMONIALS[activeTestimonial].text}&rdquo;
            </p>

            <div className="space-y-1">
              <h4 className="font-black text-base text-white">{TESTIMONIALS[activeTestimonial].name}</h4>
              <p className="text-xs text-emerald-300 font-semibold">
                {TESTIMONIALS[activeTestimonial].role} • <span className="text-amber-400 font-bold">Terverifikasi</span>
              </p>
            </div>
          </div>

          {/* Testimonial Selectors */}
          <div className="flex items-center justify-center gap-2 pt-2 relative z-10">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className={`h-2.5 rounded-full transition-all cursor-pointer ${
                  activeTestimonial === i ? 'w-8 bg-emerald-400' : 'w-2.5 bg-zinc-700 hover:bg-zinc-600'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
