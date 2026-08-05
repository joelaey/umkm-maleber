'use client';

import React from 'react';
import { UserRole, UserProfile } from '@/types';
import { ShoppingBag, Store, Bike, ShieldCheck, Crown, ShoppingCart, User, LogOut, Sun, Moon, MapPin } from 'lucide-react';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  cartCount: number;
  onOpenCart?: () => void;
  currentUser?: UserProfile | null;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenProfile?: () => void;
  onLogout: () => void;
  onGoToLanding: () => void;
  isLandingActive?: boolean;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export default function Header({
  currentRole,
  onRoleChange,
  cartCount,
  onOpenCart,
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onLogout,
  onGoToLanding,
  isLandingActive,
  theme = 'dark',
  onToggleTheme
}: HeaderProps) {
  const roleConfig: Record<UserRole, { label: string; fullLabel: string; icon: any; color: string; badgeBg: string }> = {
    buyer: { label: 'Pembeli', fullLabel: 'Mode Pembeli (Warga)', icon: ShoppingBag, color: 'text-emerald-600', badgeBg: 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300/40' },
    seller: { label: 'Penjual', fullLabel: 'Mode Penjual (UMKM)', icon: Store, color: 'text-amber-600', badgeBg: 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300/40' },
    driver: { label: 'Driver', fullLabel: 'Mode Driver (Ojek)', icon: Bike, color: 'text-blue-600', badgeBg: 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-300/40' },
    admin: { label: 'Petugas Desa', fullLabel: 'Admin Desa Maleber', icon: ShieldCheck, color: 'text-purple-600', badgeBg: 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-300/40' },
    superadmin: { label: 'Super Admin', fullLabel: 'Pemilik Sistem (Super Admin)', icon: Crown, color: 'text-amber-500', badgeBg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300/40' }
  };

  const CurrentRoleIcon = roleConfig[currentRole].icon;

  return (
    <header className="sticky top-0 z-50 glass border-b border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={onGoToLanding}
              className="flex items-center gap-2 sm:gap-3 cursor-pointer text-left group"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-base sm:text-xl shadow-md group-hover:scale-105 transition-transform glow-emerald">
                M
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs sm:text-lg text-zinc-900 dark:text-white tracking-tight">
                    Maleber
                  </span>
                  <span className="hidden sm:inline-block bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300/50">
                    Desa Digital
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Karangtengah, Cianjur
                </p>
              </div>
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            
            {/* LIGHT / DARK MODE TOGGLE */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="p-2 sm:p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                title={`Ganti Mode Ke ${theme === 'dark' ? 'Terang (Light)' : 'Gelap (Dark)'}`}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-600 fill-indigo-600/20" />
                )}
              </button>
            )}

            {/* Cart Button */}
            {!isLandingActive && currentRole === 'buyer' && (
              <button
                onClick={onOpenCart}
                className="relative p-2 sm:p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
                title="Keranjang Belanja"
              >
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[9px] sm:text-[10px] font-bold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shadow-md tabular-nums">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Auth / Profile */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/70 p-1 sm:p-1.5 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/40">
                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity pl-1"
                  title="Pengaturan Profil & Alamat Favorit"
                >
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl object-cover ring-2 ring-emerald-500/30"
                    />
                  ) : (
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="text-xs font-bold text-zinc-900 dark:text-white hidden md:inline max-w-[100px] truncate">
                    {currentUser.name}
                  </span>
                </button>

                {/* Vertical Divider for Spacing */}
                <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1"></div>

                <button
                  onClick={onLogout}
                  className="p-1.5 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  title="Keluar dari Akun"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onOpenAuth('login')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] sm:text-xs px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all cursor-pointer shadow-sm btn-ripple whitespace-nowrap"
              >
                Masuk
              </button>
            )}

          </div>
        </div>
      </div>
    </header>
  );
}
