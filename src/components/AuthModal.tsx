'use client';

import React, { useState } from 'react';
import { UserRole, UserProfile } from '@/types';
import { INITIAL_USERS } from '@/lib/mockData';
import { User, Lock, Phone, Mail, AlertCircle, ArrowRight, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  initialRole?: UserRole;
  onAuthSuccess: (user: UserProfile) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
  initialRole = 'buyer',
  onAuthSuccess
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Form State
  const [identifier, setIdentifier] = useState(''); // Can be Email or WhatsApp phone
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // OTP State
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [otpSentMsg, setOtpSentMsg] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSendEmailOtp = async (targetEmail: string) => {
    if (!targetEmail || !targetEmail.includes('@')) {
      setErrorMsg('Masukkan alamat email yang valid untuk menerima OTP!');
      return false;
    }

    setSendingOtp(true);
    setErrorMsg('');
    setOtpSentMsg('');

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetEmail,
          type: 'otp',
          name: name || 'Warga Maleber',
          otpCode: otp
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengirim email OTP via Resend');
      }

      setOtpSentMsg(`Kode OTP 6-digit berhasil dikirim ke email: ${targetEmail}`);
      setStep('otp');
      return true;
    } catch (err: any) {
      console.error('Resend OTP Error:', err);
      setErrorMsg(`Gagal mengirim OTP via Resend: ${err.message}`);
      return false;
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (mode === 'login') {
        // REAL AUTHENTICATION CHECK (Supports Email OR WhatsApp Phone Number)
        const cleanInput = identifier.trim().toLowerCase();
        const cleanPhoneInput = identifier.replace(/[^0-9]/g, '');

        const foundUser = INITIAL_USERS.find((u) => {
          const emailMatch = u.email?.toLowerCase() === cleanInput;
          const phoneMatch = cleanPhoneInput.length >= 6 && u.phone?.replace(/[^0-9]/g, '') === cleanPhoneInput;
          return emailMatch || phoneMatch;
        });

        if (!foundUser) {
          setErrorMsg('Akun email atau nomor WhatsApp tidak ditemukan. Silakan periksa kembali!');
          setLoading(false);
          return;
        }

        if (foundUser.password && password !== foundUser.password) {
          setErrorMsg('Kata sandi yang Anda masukkan salah. Silakan coba lagi!');
          setLoading(false);
          return;
        }

        onAuthSuccess(foundUser);
        onClose();
      } else {
        // REGISTRATION MODE
        if (!name || !identifier || !password) {
          setErrorMsg('Mohon lengkapi semua data pendaftaran!');
          setLoading(false);
          return;
        }

        const isEmailInput = identifier.includes('@');
        if (isEmailInput && step === 'form') {
          // Send OTP email via Resend before completing registration
          const sent = await handleSendEmailOtp(identifier);
          if (sent) {
            setLoading(false);
            return;
          }
        }

        const newUser: UserProfile = {
          id: `a0000000-${Date.now().toString().slice(-4)}-4000-8000-${Math.floor(Math.random()*1000000000000).toString().padStart(12, '0')}`,
          name,
          email: isEmailInput ? identifier : `${identifier}@maleber.des.id`,
          phone: isEmailInput ? (phone || '081234567890') : identifier,
          role: 'buyer', // Public registration defaults to buyer
          password,
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
        };

        onAuthSuccess(newUser);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg('Gagal memproses autentikasi. Silakan coba kembali!');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (inputOtp.trim() !== generatedOtp) {
      setErrorMsg('Kode OTP yang Anda masukkan salah. Silakan cek kembali email Anda!');
      return;
    }

    const isEmailInput = identifier.includes('@');
    const newUser: UserProfile = {
      id: `a0000000-${Date.now().toString().slice(-4)}-4000-8000-${Math.floor(Math.random()*1000000000000).toString().padStart(12, '0')}`,
      name,
      email: isEmailInput ? identifier : `${identifier}@maleber.des.id`,
      phone: isEmailInput ? (phone || '081234567890') : identifier,
      role: 'buyer',
      password,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
    };

    onAuthSuccess(newUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 modal-overlay" onClick={onClose}>
      <div 
        className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl border border-zinc-200 dark:border-zinc-800 modal-content relative overflow-y-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Modal Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-zinc-900 dark:text-white mt-2">
            {mode === 'login' ? 'Masuk Akun Maleber' : 'Daftar Akun Warga'}
          </h3>
          <p className="text-xs text-zinc-500">
            {mode === 'login'
              ? 'Gunakan email atau nomor WhatsApp terdaftar Anda'
              : 'Daftar sebagai warga Maleber untuk belanja & pesan ojek'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/50 p-3 rounded-2xl flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-head-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* OTP Verification Step */}
        {step === 'otp' ? (
          <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
            {otpSentMsg && (
              <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-2xl text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                📧 {otpSentMsg}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Masukkan 6 Digit Kode OTP Email:
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="Contoh: 123456"
                value={inputOtp}
                onChange={(e) => setInputOtp(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-center text-xl font-black tracking-widest text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
              <p className="text-[11px] text-zinc-500 mt-1.5 text-center">
                Kode OTP telah dikirimkan secara otomatis via <strong>Resend Email</strong>.
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3.5 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              Verifikasi Kode OTP &amp; Selesaikan
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex justify-between items-center text-xs pt-2">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-bold"
              >
                ← Kembali ke Form
              </button>
              <button
                type="button"
                disabled={sendingOtp}
                onClick={() => handleSendEmailOtp(identifier)}
                className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
              >
                {sendingOtp ? 'Mengirim...' : 'Kirim Ulang OTP Email'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Nama Lengkap:</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Masukkan nama lengkap Anda"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                {mode === 'login' ? 'Email atau Nomor WhatsApp:' : 'Alamat Email:'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder={mode === 'login' ? "Masukkan email atau nomor telepon" : "Masukkan alamat email"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Kata Sandi:</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="password"
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Nomor WhatsApp:</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Masukkan nomor WhatsApp"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || sendingOtp}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3.5 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading || sendingOtp ? 'Memproses OTP Resend Email...' : mode === 'login' ? 'Masuk' : 'Daftar Akun (OTP Email Resend)'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Footer Toggle Mode */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 text-center">
          {mode === 'login' ? (
            <p className="text-xs text-zinc-500">
              Belum punya akun?{' '}
              <button
                onClick={() => { setMode('register'); setStep('form'); setErrorMsg(''); }}
                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Daftar Akun Baru
              </button>
            </p>
          ) : (
            <p className="text-xs text-zinc-500">
              Sudah punya akun?{' '}
              <button
                onClick={() => { setMode('login'); setStep('form'); setErrorMsg(''); }}
                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Masuk
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
