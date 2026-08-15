import React, { useState } from 'react';
import { UserRole, UserProfile, SavedAddress } from '@/types';
import { INITIAL_USERS } from '@/lib/mockData';
import { verifyPassword } from '@/lib/cryptoUtils';
import { User, Lock, Phone, Mail, AlertCircle, ArrowRight, X, CheckCircle2, ShieldCheck, MessageSquare, UserCheck, CheckCircle, Map as MapIcon, Crosshair, KeyRound, Crop, Camera } from 'lucide-react';
import MapComponent from './MapComponent';
import AvatarCropModal, { DEFAULT_BLANK_AVATAR } from './AvatarCropModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  initialRole?: UserRole;
  onAuthSuccess: (user: UserProfile) => void;
  users?: UserProfile[];
}

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
  initialRole = 'buyer',
  onAuthSuccess,
  users = []
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>(initialMode);

  // Login Form State
  const [identifier, setIdentifier] = useState(''); // Can be Email or WhatsApp phone
  const [loginPassword, setLoginPassword] = useState('');

  // Password Reset Self-Service OTP State
  const [resetContact, setResetContact] = useState('');
  const [forgotStep, setForgotStep] = useState<'input' | 'verify'>('input');
  const [forgotMethod, setForgotMethod] = useState<'email' | 'whatsapp'>('whatsapp');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotPinDigits, setForgotPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Register Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Multi-step Registration OTP State
  const [step, setStep] = useState<'form' | 'select_method' | 'otp' | 'complete_profile'>('form');
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'whatsapp'>('email');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [otpSentMsg, setOtpSentMsg] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', '']);

  // Handle Location Picker for Home/Store Location
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [homeCoords, setHomeCoords] = useState<{ lat: number; lng: number }>({ lat: -6.8155, lng: 107.1865 });
  const [homeAddress, setHomeAddress] = useState('Desa Maleber, Karangtengah, Cianjur');

  // Reverse Geocoding via Nominatim API when coords change in Location Picker
  const handleCoordsChange = async (newLat: number, newLng: number) => {
    setHomeCoords({ lat: newLat, lng: newLng });
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}`);
      const data = await res.json();
      if (data && data.display_name) {
        setHomeAddress(data.display_name);
      } else {
        setHomeAddress(`Lokasi (${newLat.toFixed(5)}, ${newLng.toFixed(5)})`);
      }
    } catch {
      setHomeAddress(`Lokasi (${newLat.toFixed(5)}, ${newLng.toFixed(5)})`);
    }
  };

  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_BLANK_AVATAR);
  const [showCropModal, setShowCropModal] = useState<boolean>(false);
  const [officeAddress, setOfficeAddress] = useState('Balai Desa Maleber, Kec. Maleber');
  const [favoriteAddress, setFavoriteAddress] = useState('Pos Ronda Dusun Pahing');
  const [bioNote, setBioNote] = useState('Depan pagar hijau rumah Pak RT');
  const [storeCoords, setStoreCoords] = useState({ lat: -6.8155, lng: 107.1865 });
  const [showRegisterMap, setShowRegisterMap] = useState(true);

  const handleRegisterMarkerDragEnd = async (newLat: number, newLng: number) => {
    setStoreCoords({ lat: newLat, lng: newLng });
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}`);
      const data = await res.json();
      if (data && data.display_name) {
        setHomeAddress(data.display_name);
      } else {
        setHomeAddress(`Lokasi Toko (${newLat.toFixed(5)}, ${newLng.toFixed(5)}), Desa Maleber`);
      }
    } catch {
      setHomeAddress(`Lokasi Toko (${newLat.toFixed(5)}, ${newLng.toFixed(5)}), Desa Maleber`);
    }
  };

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [registerRole, setRegisterRole] = useState<UserRole>(initialRole || 'buyer');
  const [storeName, setStoreName] = useState('');

  if (!isOpen) return null;

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const cleanInput = identifier.trim();
      if (!cleanInput) {
        setErrorMsg('Silakan masukkan email atau nomor WhatsApp Anda.');
        setLoading(false);
        return;
      }

      if (!loginPassword) {
        setErrorMsg('Silakan masukkan kata sandi Anda.');
        setLoading(false);
        return;
      }

      // Secure Server-side Authentication
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          data: {
            identifier: cleanInput,
            password: loginPassword
          }
        })
      });

      const result = await res.json();

      if (!res.ok || !result.success || !result.user) {
        setErrorMsg(result.error || 'Akun atau kata sandi tidak valid. Silakan coba kembali.');
        setLoading(false);
        return;
      }

      onAuthSuccess(result.user);
      onClose();
    } catch (err) {
      setErrorMsg('Gagal memproses autentikasi ke server. Silakan periksa koneksi internet Anda!');
    } finally {
      setLoading(false);
    }
  };

  // Handle Submit Forgot Password Request -> Send OTP directly to Email / WhatsApp
  const handleForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setErrorMsg('');
    setResetSuccessMsg('');

    const cleanContact = resetContact.trim();
    if (!cleanContact) {
      setErrorMsg('Mohon masukkan alamat email atau nomor WhatsApp terdaftar Anda!');
      setForgotLoading(false);
      return;
    }

    try {
      // 1. Verify user exists in database
      const checkRes = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_user_exists',
          data: { identifier: cleanContact }
        })
      });

      const checkData = await checkRes.json();
      if (!checkRes.ok || !checkData.success || !checkData.user) {
        setErrorMsg(checkData.error || `Akun "${cleanContact}" tidak terdaftar di sistem Desa Maleber. Silakan periksa kembali!`);
        setForgotLoading(false);
        return;
      }

      const targetUser = checkData.user;
      const isEmail = cleanContact.includes('@');
      const method = isEmail ? 'email' : 'whatsapp';
      setForgotMethod(method);

      // 2. Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setForgotOtp(otp);

      // 3. Dispatch OTP via Email or WhatsApp
      if (isEmail) {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: targetUser.email || cleanContact,
            type: 'otp',
            name: targetUser.name || 'Warga Maleber',
            otpCode: otp
          })
        });
        setOtpSentMsg(`✅ Kode OTP 6-digit telah dikirimkan ke email: ${targetUser.email || cleanContact}`);
      } else {
        await fetch('/api/wablas/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: targetUser.phone || cleanContact,
            otpCode: otp,
            name: targetUser.name || 'Warga Maleber'
          })
        });
        setOtpSentMsg(`✅ Kode OTP 6-digit telah dikirimkan ke WhatsApp: ${targetUser.phone || cleanContact}`);
      }

      setForgotStep('verify');
    } catch (err) {
      setErrorMsg('Gagal memproses permintaan OTP ke server. Periksa koneksi internet Anda!');
    } finally {
      setForgotLoading(false);
    }
  };

  // Handle Verify OTP & Save New Password
  const handleForgotVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const inputPin = forgotPinDigits.join('');
    if (inputPin.length !== 6 || inputPin !== forgotOtp) {
      setErrorMsg('Kode OTP 6-digit yang Anda masukkan salah atau belum lengkap. Silakan periksa kembali!');
      return;
    }

    if (forgotNewPassword.length < 6) {
      setErrorMsg('Kata sandi baru minimal 6 karakter!');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMsg('Konfirmasi kata sandi baru tidak cocok!');
      return;
    }

    setForgotLoading(true);

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_password_with_otp',
          data: {
            identifier: resetContact.trim(),
            newPassword: forgotNewPassword
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.user) {
        setErrorMsg(data.error || 'Gagal memperbarui kata sandi. Silakan coba kembali.');
        setForgotLoading(false);
        return;
      }

      // Auto login and finish!
      onAuthSuccess(data.user);
      onClose();
    } catch (err) {
      setErrorMsg('Gagal memperbarui kata sandi ke server database.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 1 Register Form Submit -> Move to Select Verification Method
  const handleRegisterFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name || !email || !phone || !password) {
      setErrorMsg('Mohon lengkapi seluruh data pendaftaran (Nama, Email, WhatsApp, dan Kata Sandi)!');
      return;
    }

    if (!email.includes('@')) {
      setErrorMsg('Alamat email yang dimasukkan tidak valid!');
      return;
    }

    if (phone.replace(/[^0-9]/g, '').length < 8) {
      setErrorMsg('Nomor WhatsApp yang dimasukkan tidak valid (minimal 8 digit)!');
      return;
    }

    setStep('select_method');
  };

  // Step 2 Send OTP via Email (Resend) or WhatsApp
  const handleSendOtp = async (method: 'email' | 'whatsapp') => {
    setSelectedMethod(method);
    setSendingOtp(true);
    setErrorMsg('');
    setOtpSentMsg('');

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);

    try {
      if (method === 'email') {
        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            type: 'otp',
            name: name || 'Warga Maleber',
            otpCode: otp
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setOtpSentMsg(`✅ Kode OTP 6-digit berhasil dikirim via Resend ke email: ${email}`);
        } else if (data.notice) {
          setOtpSentMsg(data.notice);
        } else {
          setOtpSentMsg(`ℹ️ Kode verifikasi OTP telah dikirimkan ke email: ${email}`);
        }
      } else {
        // WhatsApp OTP via Wablas API
        const res = await fetch('/api/wablas/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phone,
            otpCode: otp,
            name: name || 'Warga Maleber'
          })
        });

        const data = await res.json();
        if (res.ok && data.success && !data.fallbackMode) {
          setOtpSentMsg(`✅ Kode OTP 6-digit berhasil dikirim ke nomor WhatsApp: ${phone}`);
        } else if (data.notice) {
          setOtpSentMsg(data.notice);
        } else {
          setOtpSentMsg(`ℹ️ Kode verifikasi OTP telah dikirimkan ke nomor WhatsApp: ${phone}`);
        }
      }

      setStep('otp');
    } catch (err: any) {
      console.warn('OTP Send Notice:', err);
      setOtpSentMsg(`ℹ️ Kode OTP verifikasi telah dikirimkan.`);
      setStep('otp');
    } finally {
      setSendingOtp(false);
    }
  };

  // 6-Digit PIN Boxes Handlers
  const handlePinChange = (index: number, value: string) => {
    const cleanVal = value.replace(/[^0-9]/g, '');
    
    // Paste support
    if (cleanVal.length > 1) {
      const chars = cleanVal.slice(0, 6).split('');
      const updated = ['', '', '', '', '', ''];
      chars.forEach((c, idx) => {
        if (idx < 6) updated[idx] = c;
      });
      setPinDigits(updated);
      setInputOtp(updated.join(''));
      const nextIdx = Math.min(chars.length, 5);
      const nextEl = document.getElementById(`otp-pin-${nextIdx}`);
      nextEl?.focus();
      return;
    }

    const updated = [...pinDigits];
    updated[index] = cleanVal;
    setPinDigits(updated);
    setInputOtp(updated.join(''));

    if (index < 5 && cleanVal) {
      const nextEl = document.getElementById(`otp-pin-${index + 1}`);
      nextEl?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      const updated = [...pinDigits];
      updated[index - 1] = '';
      setPinDigits(updated);
      setInputOtp(updated.join(''));
      const prevEl = document.getElementById(`otp-pin-${index - 1}`);
      prevEl?.focus();
    }
  };

  // Step 3 Verify 6-digit OTP Code -> Transition to Complete Profile
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const finalOtp = pinDigits.join('');
    if (finalOtp.length !== 6 || finalOtp !== generatedOtp) {
      setErrorMsg('Kode OTP 6-digit yang Anda masukkan salah atau belum lengkap. Silakan periksa kembali!');
      return;
    }

    // Direct to Step 4: Complete Profile & Address details
    setStep('complete_profile');
  };

  // Step 4 Complete Profile Submit -> Save to Supabase PostgreSQL & Finish Registration
  const handleCompleteProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const savedAddresses: SavedAddress[] = registerRole === 'seller'
      ? [{ id: 'addr-store', label: 'Rumah' as const, name: `Toko: ${storeName || 'Toko UMKM'} - ${homeAddress}`, lat: storeCoords.lat, lng: storeCoords.lng }]
      : [
          { id: 'addr-home', label: 'Rumah' as const, name: homeAddress, lat: storeCoords.lat, lng: storeCoords.lng },
          { id: 'addr-office', label: 'Kantor' as const, name: officeAddress, lat: -6.8110, lng: 107.1890 },
          { id: 'addr-fav', label: 'Tempat Favorit' as const, name: favoriteAddress, lat: -6.8148, lng: 107.1870 }
        ].filter((a) => a.name.trim().length > 0);

    const newUser: UserProfile = {
      id: `a0000000-${Date.now().toString().slice(-4)}-4000-8000-${Math.floor(Math.random()*1000000000000).toString().padStart(12, '0')}`,
      name,
      email,
      phone,
      role: registerRole,
      storeName: registerRole === 'seller' ? (storeName || `Toko UMKM ${name}`) : undefined,
      password,
      avatar: avatarUrl,
      savedAddresses
    };

    // Save user row directly into Supabase PostgreSQL profiles table
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register_user', data: newUser })
      });
    } catch (err) {
      console.error('Failed to insert user profile into Supabase:', err);
    } finally {
      setLoading(false);
    }

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
            {mode === 'forgot_password' ? <KeyRound className="w-6 h-6 text-amber-500" /> : step === 'otp' ? <ShieldCheck className="w-6 h-6" /> : step === 'complete_profile' ? <UserCheck className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <h3 className="text-xl font-black text-zinc-900 dark:text-white mt-2">
            {mode === 'login' 
              ? 'Masuk Akun Maleber' 
              : mode === 'forgot_password'
              ? 'Reset Password / Lupa Kata Sandi'
              : step === 'select_method'
              ? 'Pilih Metode Verifikasi'
              : step === 'otp'
              ? 'Verifikasi Kode OTP'
              : step === 'complete_profile'
              ? 'Lengkapi Profil & Alamat Anda'
              : 'Daftar Akun Warga Baru'}
          </h3>
          <p className="text-xs text-zinc-500">
            {mode === 'login'
              ? 'Masukkan email/WhatsApp dan kata sandi Anda'
              : mode === 'forgot_password'
              ? 'Kirimkan laporan reset kata sandi ke Super Admin Desa'
              : step === 'complete_profile'
              ? 'Verifikasi OTP sukses! Tambahkan foto avatar & lokasi favorit Anda.'
              : step === 'select_method'
              ? 'Pilih media pengiriman kode OTP 6-digit'
              : step === 'otp'
              ? 'Masukkan 6 digit kode PIN verifikasi'
              : 'Isi data diri awal untuk memulai pendaftaran'}
          </p>
        </div>

        {/* STEP 4: COMPLETE PROFILE & FAVOURITE ADDRESSES FORM */}
        {mode === 'register' && step === 'complete_profile' && (
          <form onSubmit={handleCompleteProfileSubmit} className="space-y-4 pt-1">
            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-300 font-bold">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Avatar Selection */}
            <div className="space-y-2 text-center">
              <label className="text-xs font-black text-zinc-700 dark:text-zinc-300 block">
                📸 Foto Profil Akun Anda (WhatsApp Style)
              </label>

              <div className="relative w-20 h-20 mx-auto group">
                <img
                  src={avatarUrl || DEFAULT_BLANK_AVATAR}
                  alt={name}
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-emerald-500/30 shadow-lg mx-auto bg-zinc-100 dark:bg-zinc-800"
                />
                <button
                  type="button"
                  onClick={() => setShowCropModal(true)}
                  className="absolute -bottom-1 -right-1 bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-full shadow-md cursor-pointer transition-transform group-hover:scale-110"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowCropModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-2xl text-xs font-extrabold cursor-pointer transition-all inline-flex items-center gap-1.5 shadow-md"
                >
                  <Crop className="w-3.5 h-3.5" /> ✂️ Unggah &amp; Potong Foto Profil
                </button>
              </div>

              <AvatarCropModal
                isOpen={showCropModal}
                onClose={() => setShowCropModal(false)}
                initialImage={avatarUrl}
                onCropComplete={(croppedDataUrl) => setAvatarUrl(croppedDataUrl)}
              />
            </div>

            {registerRole === 'seller' ? (
              <>
                {/* Store Name Input */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    🏪 Nama Toko / Usaha UMKM Anda:
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Contoh: Warung Liwet Bu Imas Maleber"
                    className="w-full px-4 py-3 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-white font-medium"
                    required
                  />
                </div>

                {/* Store Location with Drop Pin Map */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center flex-wrap gap-1">
                    <label className="text-xs font-black text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                      📍 Alamat Lengkap &amp; Titik Lokasi Toko di Peta:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowRegisterMap(!showRegisterMap)}
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        showRegisterMap
                          ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                      }`}
                    >
                      <MapIcon className="w-3.5 h-3.5" />
                      {showRegisterMap ? 'Tutup Peta' : '📌 Drop Pin Peta Toko'}
                    </button>
                  </div>

                  {/* Interactive Map for Store Location Drop Pin */}
                  {showRegisterMap && (
                    <div className="space-y-1.5 border border-emerald-500/50 rounded-2xl overflow-hidden p-1 bg-emerald-50 dark:bg-emerald-950/40">
                      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 px-2 block">
                        📍 Klik / geser peta untuk menentukan titik lokasi toko Anda secara persis:
                      </span>
                      <div className="h-44 rounded-xl overflow-hidden shadow-inner">
                        <MapComponent
                          center={storeCoords}
                          zoom={16}
                          selectionMode="dest"
                          destLocation={{ lat: storeCoords.lat, lng: storeCoords.lng, address: homeAddress }}
                          onSelectDest={(lat, lng) => handleRegisterMarkerDragEnd(lat, lng)}
                        />
                      </div>
                    </div>
                  )}

                  <input
                    type="text"
                    value={homeAddress}
                    onChange={(e) => setHomeAddress(e.target.value)}
                    placeholder="Alamat fisik toko (Dusun/RT/RW)..."
                    className="w-full px-4 py-3 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-white font-medium"
                    required
                  />
                </div>
              </>
            ) : (
              /* Buyer Form with Saved Addresses & Drop Pin */
              <>
                {/* Home Address / Buyer Location with Drop Pin Map */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center flex-wrap gap-1">
                    <label className="text-xs font-black text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                      🏠 Alamat Utama (Rumah / Tempat Tinggal):
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowRegisterMap(!showRegisterMap)}
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        showRegisterMap
                          ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                      }`}
                    >
                      <MapIcon className="w-3.5 h-3.5" />
                      {showRegisterMap ? 'Tutup Peta' : '📌 Drop Pin Peta'}
                    </button>
                  </div>

                  {/* Interactive Map for Home Location Drop Pin */}
                  {showRegisterMap && (
                    <div className="space-y-1.5 border border-emerald-500/50 rounded-2xl overflow-hidden p-1 bg-emerald-50 dark:bg-emerald-950/40">
                      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 px-2 block">
                        📍 Klik / geser peta untuk menentukan titik lokasi rumah Anda secara persis:
                      </span>
                      <div className="h-44 rounded-xl overflow-hidden shadow-inner">
                        <MapComponent
                          center={storeCoords}
                          zoom={16}
                          selectionMode="dest"
                          destLocation={{ lat: storeCoords.lat, lng: storeCoords.lng, address: homeAddress }}
                          onSelectDest={(lat, lng) => handleRegisterMarkerDragEnd(lat, lng)}
                        />
                      </div>
                    </div>
                  )}

                  <input
                    type="text"
                    value={homeAddress}
                    onChange={(e) => setHomeAddress(e.target.value)}
                    placeholder="Contoh: RT 02 / RW 01 Dusun Manis, Desa Maleber"
                    className="w-full px-4 py-3 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-white font-medium"
                  />
                </div>

                {/* Office Address (Kantor) */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    🏢 Alamat Kantor / Tempat Kerja (Opsional)
                  </label>
                  <input
                    type="text"
                    value={officeAddress}
                    onChange={(e) => setOfficeAddress(e.target.value)}
                    placeholder="Contoh: Balai Desa Maleber / Kantor Kecamatan"
                    className="w-full px-4 py-3 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-white font-medium"
                  />
                </div>

                {/* Favorite Location (Patokan) */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    📍 Lokasi Favorit / Patokan Pengiriman
                  </label>
                  <input
                    type="text"
                    value={favoriteAddress}
                    onChange={(e) => setFavoriteAddress(e.target.value)}
                    placeholder="Contoh: Pos Ronda Dusun Pahing / Depan Masjid"
                    className="w-full px-4 py-3 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-white font-medium"
                  />
                </div>
              </>
            )}

            {/* Bio / Delivery Note */}
            <div className="space-y-1">
              <label className="text-xs font-black text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                📝 Catatan Tambahan Profil
              </label>
              <input
                type="text"
                value={bioNote}
                onChange={(e) => setBioNote(e.target.value)}
                placeholder="Contoh: Pagar rumah warna hijau depan pos siskamling"
                className="w-full px-4 py-3 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-white font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3.5 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading ? 'Menyimpan Profile...' : 'Simpan Profile & Masuk ke Aplikasi'}
              <CheckCircle className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/50 p-3 rounded-2xl flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-head-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ---------------- LOGIN MODE ---------------- */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Email atau Nomor WhatsApp:
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Masukkan email atau nomor telepon"
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
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot_password');
                    setErrorMsg('');
                    setResetSuccessMsg('');
                  }}
                  className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  🔑 Lupa Kata Sandi?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3.5 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading ? 'Memproses...' : 'Masuk Akun'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ---------------- FORGOT PASSWORD MODE (SELF-SERVICE VIA OTP) ---------------- */}
        {mode === 'forgot_password' && (
          <div className="space-y-4">
            {forgotStep === 'input' ? (
              <form onSubmit={handleForgotSendOtp} className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                  <p className="font-extrabold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                    🔐 Reset Kata Sandi Otomatis (OTP)
                  </p>
                  <p className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                    Masukkan email atau nomor WhatsApp terdaftar Anda. Sistem akan mengirimkan <strong>kode OTP 6-digit</strong> secara langsung untuk verifikasi instan.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Email atau Nomor WhatsApp Terdaftar:
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Contoh: 08123456789 atau nama@email.com"
                      value={resetContact}
                      onChange={(e) => setResetContact(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3.5 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {forgotLoading ? 'Memeriksa & Mengirim OTP...' : 'Kirim Kode OTP Verifikasi'}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); }}
                  className="w-full text-center text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 py-1 cursor-pointer"
                >
                  ← Batal &amp; Kembali ke Login
                </button>
              </form>
            ) : (
              /* STEP 2: ENTER OTP & NEW PASSWORD */
              <form onSubmit={handleForgotVerifyAndReset} className="space-y-4">
                {otpSentMsg && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-2xl flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{otpSentMsg}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block text-center mb-1">
                    Masukkan 6-Digit Kode OTP:
                  </label>
                  
                  {/* 6 Discrete PIN Boxes */}
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 my-2">
                    {[0, 1, 2, 3, 4, 5].map((idx) => (
                      <input
                        key={idx}
                        id={`forgot-pin-${idx}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={forgotPinDigits[idx]}
                        onChange={(e) => {
                          const cleanVal = e.target.value.replace(/[^0-9]/g, '');
                          if (cleanVal.length > 1) {
                            const chars = cleanVal.slice(0, 6).split('');
                            const updated = ['', '', '', '', '', ''];
                            chars.forEach((c, i) => { if (i < 6) updated[i] = c; });
                            setForgotPinDigits(updated);
                            const nextIdx = Math.min(chars.length, 5);
                            document.getElementById(`forgot-pin-${nextIdx}`)?.focus();
                            return;
                          }
                          const updated = [...forgotPinDigits];
                          updated[idx] = cleanVal;
                          setForgotPinDigits(updated);
                          if (idx < 5 && cleanVal) {
                            document.getElementById(`forgot-pin-${idx + 1}`)?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !forgotPinDigits[idx] && idx > 0) {
                            const updated = [...forgotPinDigits];
                            updated[idx - 1] = '';
                            setForgotPinDigits(updated);
                            document.getElementById(`forgot-pin-${idx - 1}`)?.focus();
                          }
                        }}
                        className={`w-10 h-12 sm:w-11 sm:h-13 text-center text-xl font-black rounded-2xl border-2 transition-all focus:outline-none ${
                          forgotPinDigits[idx]
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 shadow-md scale-105'
                            : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:border-emerald-500'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Kata Sandi Baru:
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="password"
                      placeholder="Minimal 6 karakter"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Konfirmasi Kata Sandi Baru:
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="password"
                      placeholder="Ketik ulang kata sandi baru"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3.5 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {forgotLoading ? 'Memperbarui Kata Sandi...' : 'Verifikasi OTP & Simpan Kata Sandi'}
                  <CheckCircle className="w-4 h-4" />
                </button>

                <div className="flex justify-between items-center text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => { setForgotStep('input'); setErrorMsg(''); }}
                    className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-bold cursor-pointer"
                  >
                    ← Ganti Kontak
                  </button>
                  <button
                    type="button"
                    disabled={forgotLoading}
                    onClick={handleForgotSendOtp}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                  >
                    Kirim Ulang OTP
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ---------------- REGISTER MODE: STEP 1 (FORM) ---------------- */}
        {mode === 'register' && step === 'form' && (
          <form onSubmit={handleRegisterFormSubmit} className="space-y-3.5">
            {/* Auto Buyer Registration Info Banner */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 sm:p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-xs">Pendaftaran Otomatis: Pembeli (Warga)</p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 leading-relaxed">
                  Pendaftaran di website ini khusus untuk akun <strong>Warga/Pembeli</strong>. Untuk pendaftaran <strong>Mitra Toko UMKM</strong> dan <strong>Driver Ojek Desa</strong>, silakan mengajukan berkas verifikasi langsung ke Petugas di Kantor Desa Maleber.
                </p>
              </div>
            </div>

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

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Alamat Email:</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  placeholder="contoh@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Nomor WhatsApp:</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="081234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Kata Sandi Akun:</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="password"
                  placeholder="Buat kata sandi aman"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3.5 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              Lanjut Pilih Verifikasi OTP
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ---------------- REGISTER MODE: STEP 2 (SELECT VERIFICATION METHOD) ---------------- */}
        {mode === 'register' && step === 'select_method' && (
          <div className="space-y-4">
            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 text-center">
              Pilih media mana yang ingin Anda gunakan untuk menerima kode OTP 6-digit:
            </p>

            <div className="space-y-3">
              {/* Option A: Resend Email */}
              <button
                type="button"
                disabled={sendingOtp}
                onClick={() => handleSendOtp('email')}
                className="w-full p-4 rounded-2xl border-2 border-emerald-500/50 hover:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 hover:bg-emerald-100/50 transition-all text-left flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
                    📧
                  </div>
                  <div>
                    <h5 className="font-extrabold text-sm text-zinc-900 dark:text-white">Verifikasi via Email (Resend)</h5>
                    <p className="text-xs text-zinc-500 truncate max-w-[200px] sm:max-w-[240px]">Ke: {email}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Option B: WhatsApp */}
              <button
                type="button"
                disabled={sendingOtp}
                onClick={() => handleSendOtp('whatsapp')}
                className="w-full p-4 rounded-2xl border-2 border-emerald-500/50 hover:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 hover:bg-emerald-100/50 transition-all text-left flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
                    📱
                  </div>
                  <div>
                    <h5 className="font-extrabold text-sm text-zinc-900 dark:text-white">Verifikasi via WhatsApp</h5>
                    <p className="text-xs text-zinc-500 truncate max-w-[200px] sm:max-w-[240px]">Ke: {phone}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStep('form')}
              className="w-full text-center text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 py-2 cursor-pointer"
            >
              ← Kembali ke Ubah Data Form
            </button>
          </div>
        )}

        {/* ---------------- REGISTER MODE: STEP 3 (ENTER & VERIFY OTP) ---------------- */}
        {mode === 'register' && step === 'otp' && (
          <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
            {otpSentMsg && (
              <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 p-3.5 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>OTP Dikirim ({selectedMethod === 'email' ? 'Resend Email' : 'WhatsApp'})</span>
                </div>
                <p className="text-[11px] leading-tight text-emerald-900/90 dark:text-emerald-200/90">{otpSentMsg}</p>
              </div>
            )}

            {generatedOtp && (
              <button
                type="button"
                onClick={() => {
                  const chars = generatedOtp.split('');
                  setPinDigits(chars);
                  setInputOtp(generatedOtp);
                }}
                className="w-full text-center text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-300/40 rounded-xl py-2 cursor-pointer transition-colors shadow-xs"
              >
                ⚡ Isikan Otomatis Kode OTP Demo ({generatedOtp})
              </button>
            )}

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block text-center mb-1">
                Masukkan 6-Digit Kode OTP:
              </label>
              
              {/* 6 Discrete PIN Boxes without placeholder */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 my-3">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <input
                    key={idx}
                    id={`otp-pin-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={pinDigits[idx]}
                    onChange={(e) => handlePinChange(idx, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(idx, e)}
                    className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-2xl border-2 transition-all focus:outline-none ${
                      pinDigits[idx]
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 shadow-md scale-105'
                        : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:border-emerald-500'
                    }`}
                  />
                ))}
              </div>

              <p className="text-[11px] text-zinc-500 mt-2 text-center">
                Silakan cek {selectedMethod === 'email' ? `inbox/spam email (${email})` : `pesan WhatsApp (${phone})`}.
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3.5 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              Verifikasi &amp; Selesaikan Pendaftaran
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex justify-between items-center text-xs pt-2">
              <button
                type="button"
                onClick={() => setStep('select_method')}
                className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-bold cursor-pointer"
              >
                ← Ganti Metode Verifikasi
              </button>
              <button
                type="button"
                disabled={sendingOtp}
                onClick={() => handleSendOtp(selectedMethod)}
                className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
              >
                {sendingOtp ? 'Mengirim...' : 'Kirim Ulang OTP'}
              </button>
            </div>
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
          ) : mode === 'forgot_password' ? (
            <p className="text-xs text-zinc-500">
              Ingat kata sandi Anda?{' '}
              <button
                onClick={() => { setMode('login'); setStep('form'); setErrorMsg(''); }}
                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Masuk ke Akun
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
