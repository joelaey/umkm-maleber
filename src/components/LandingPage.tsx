'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Utensils, Bike, ShoppingBag, ShieldCheck, ArrowRight, Star, Heart, TrendingUp, Users, CheckCircle2, MapPin, Zap, Globe, Phone, Clock, Award, Sparkles, Building2, Crown, Store } from 'lucide-react';
import { UserRole } from '@/types';

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

const TESTIMONIALS = [
  {
    name: 'Teh Rina Maleber',
    role: 'Warga Pembeli Maleber',
    text: 'Pesan nasi liwet & kebutuhan dapur dari HP langsung sampai di rumah. Drivernya tetangga desa sendiri, jadi aman dan terpercaya.',
    rating: 5
  },
  {
    name: 'Kang Asep Driver',
    role: 'Mitra Ojek Online Maleber',
    text: 'Sangat terbantu untuk menambah penghasilan harian. Fitur orderan transparan dan hemat kuota data.',
    rating: 5
  },
  {
    name: 'Ibu Imas',
    role: 'Penjual UMKM Kuliner',
    text: 'Nasi Liwet & Sambal Dadak saya sekarang punya jangkauan pemesan warga seluruh Desa Maleber!',
    rating: 5
  }
];

export default function LandingPage({
  onEnterApp,
  onOpenAuth,
  storesCount = 3,
  productsCount = 4,
  driversCount = 3,
  ordersCount = 12
}: LandingPageProps) {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const stats1 = useCountUp(storesCount || 3);
  const stats2 = useCountUp(driversCount || 3);
  const stats3 = useCountUp(productsCount || 4);

  // Auto-rotate testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-16 pb-20">

      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden pt-8 pb-12 sm:pt-14 sm:pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">

          {/* Badge Pills */}
          <div className="inline-flex items-center gap-2 bg-emerald-100/80 dark:bg-emerald-950/80 border border-emerald-300/40 dark:border-emerald-800/40 px-4 py-1.5 rounded-full shadow-sm animate-fade-in">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
              Platform Digital Resmi Desa Maleber, Cianjur
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-zinc-900 dark:text-white tracking-tight leading-[1.12]">
            Pemberdayaan <span className="text-gradient-emerald">UMKM &amp; Ojek Online</span> Desa Maleber
          </h1>

          {/* Sub-headline */}
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Ekosistem digital terpadu Kecamatan Karangtengah, Kabupaten Cianjur. Nikmati kemudahan memesan Nasi Liwet khas Cianjur, Beras Pandanwangi segar, serta ojek online antar jemput warga secara cepat dan aman.
          </p>

          {/* Action Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onOpenAuth('login')}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm px-8 py-4 rounded-2xl shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer btn-ripple group"
            >
              <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Jelajahi Sekarang</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="pt-6 border-t border-zinc-200/60 dark:border-zinc-800/60 grid grid-cols-3 gap-4 text-center max-w-2xl mx-auto">
            <div>
              <span className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white block">100%</span>
              <span className="text-[11px] text-zinc-500 font-semibold">Produk Asli Maleber</span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white block">Cepat</span>
              <span className="text-[11px] text-zinc-500 font-semibold">Antar Jemput Desa</span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white block">Transparan</span>
              <span className="text-[11px] text-zinc-500 font-semibold">Terdaftar Resmi Desa</span>
            </div>
          </div>

        </div>
      </section>

      {/* ===== LIVE REAL-TIME STATS COUNTER SECTION ===== */}
      <section className="border-y border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/60 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-1.5" ref={stats1.ref}>
            <h3 className="text-4xl sm:text-5xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {stats1.count}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-wider">Warung UMKM Terdaftar</p>
          </div>

          <div className="space-y-1.5" ref={stats2.ref}>
            <h3 className="text-4xl sm:text-5xl font-black text-teal-600 dark:text-teal-400 tabular-nums">
              {stats2.count}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-wider">Mitra Driver Ojek</p>
          </div>

          <div className="space-y-1.5" ref={stats3.ref}>
            <h3 className="text-4xl sm:text-5xl font-black text-amber-500 dark:text-amber-400 tabular-nums">
              {stats3.count}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-wider">Katalog Produk Resmi</p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-4xl sm:text-5xl font-black text-blue-600 dark:text-blue-400">
              100%
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-wider">Produk Asli Maleber</p>
          </div>
        </div>
      </section>

      {/* ===== 3 STEPS WORKFLOW SECTION ===== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-full">
            Cara Kerja Platform
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white">
            3 Langkah Mudah Penggunaan
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500">
            Kemudahan akses layanan bagi seluruh warga Desa Maleber
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">

          {/* Step 1 */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 text-center">
            <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-black px-3 py-1 rounded-full">
              LANGKAH 01
            </span>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h3 className="font-extrabold text-lg text-zinc-900 dark:text-white">Pilih Produk / Layanan Ojek</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Jelajahi berbagai kuliner khas Cianjur, beras Pandanwangi, atau tentukan titik jemput ojek online.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 text-center">
            <span className="bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-xs font-black px-3 py-1 rounded-full">
              LANGKAH 02
            </span>
            <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center mx-auto shadow-md">
              <Bike className="w-7 h-7" />
            </div>
            <h3 className="font-extrabold text-lg text-zinc-900 dark:text-white">Diproses &amp; Diantar Driver</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Penjual menyiapkan pesanan dan mitra driver ojek Maleber siap mengantar paket ke rumah Anda.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 text-center">
            <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-black px-3 py-1 rounded-full">
              LANGKAH 03
            </span>
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-extrabold text-lg text-zinc-900 dark:text-white">Terima &amp; Beri Ulasan</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Terima pesanan di tempat dan berikan rating ulasan bintang untuk mendukung perkembangan UMKM desa.
            </p>
          </div>

        </div>
      </section>

      {/* ===== TESTIMONIALS SECTION ===== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white rounded-3xl p-8 sm:p-12 shadow-2xl space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-extrabold text-emerald-300 uppercase tracking-widest">Testimoni Warga Maleber</span>
            <h2 className="text-2xl sm:text-4xl font-black">Apa Kata Warga &amp; Pelaku UMKM?</h2>
          </div>

          <div className="max-w-3xl mx-auto text-center space-y-6">
            <p className="text-base sm:text-xl font-medium italic leading-relaxed text-emerald-50">
              &ldquo;{TESTIMONIALS[activeTestimonial].text}&rdquo;
            </p>

            <div>
              <h4 className="font-black text-base text-white">{TESTIMONIALS[activeTestimonial].name}</h4>
              <p className="text-xs text-emerald-300 font-semibold">{TESTIMONIALS[activeTestimonial].role}</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
