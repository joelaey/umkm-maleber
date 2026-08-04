'use client';

import React, { useState } from 'react';
import { UserProfile, SavedAddress } from '@/types';
import { User, Mail, Phone, Home, Building, GraduationCap, MapPin, Plus, Trash2, CheckCircle2, Store, Bike, Camera, Upload, Link, Sun, Moon, Bell, ShieldCheck, Wallet, Volume2, Map as MapIcon, Crosshair } from 'lucide-react';
import { requestSystemNotificationPermission, triggerSystemNotification } from '@/lib/notificationUtils';
import MapComponent from './MapComponent';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSaveProfile: (updatedUser: UserProfile) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

const DEFAULT_SAVED_ADDRESSES: SavedAddress[] = [
  { id: 'addr-1', label: 'Rumah', name: 'Jl. Raya Maleber No. 15, RT 03/RW 01, Maleber', lat: -6.8155, lng: 107.1865 },
  { id: 'addr-2', label: 'Kantor', name: 'Balai Desa Maleber, Karangtengah, Cianjur', lat: -6.8145, lng: 107.1860 }
];

export default function ProfileModal({
  isOpen,
  onClose,
  user,
  onSaveProfile,
  theme = 'dark',
  onToggleTheme
}: ProfileModalProps) {
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [email, setEmail] = useState(user.email || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [storeName, setStoreName] = useState(user.storeName || '');
  const [vehicleInfo, setVehicleInfo] = useState(user.vehicleInfo || '');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);

  // Saved addresses state
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(
    user.savedAddresses && user.savedAddresses.length > 0 ? user.savedAddresses : DEFAULT_SAVED_ADDRESSES
  );

  // Store map state for Seller
  const [storeCoords, setStoreCoords] = useState({ lat: -6.8155, lng: 107.1865 });
  const [storeAddressText, setStoreAddressText] = useState(
    user.savedAddresses && user.savedAddresses[0]?.name
      ? user.savedAddresses[0].name
      : 'Jl. Raya Maleber No. 12, RT 02/RW 01, Dusun Manis, Maleber'
  );
  const [showStoreMap, setShowStoreMap] = useState(true);

  // Buyer map state
  const [newCoords, setNewCoords] = useState({ lat: -6.8155, lng: 107.1865 });
  const [showAddrMap, setShowAddrMap] = useState(true);

  // New address form state
  const [newLabel, setNewLabel] = useState<'Rumah' | 'Kantor' | 'Sekolah' | 'Tempat Favorit'>('Rumah');
  const [newAddressText, setNewAddressText] = useState('');
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleStoreMarkerDragEnd = async (newLat: number, newLng: number) => {
    setStoreCoords({ lat: newLat, lng: newLng });
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}`);
      const data = await res.json();
      if (data && data.display_name) {
        setStoreAddressText(data.display_name);
      } else {
        setStoreAddressText(`Lokasi Toko (${newLat.toFixed(5)}, ${newLng.toFixed(5)}), Maleber`);
      }
    } catch {
      setStoreAddressText(`Lokasi Toko (${newLat.toFixed(5)}, ${newLng.toFixed(5)}), Maleber`);
    }
  };

  const handleBuyerMarkerDragEnd = async (newLat: number, newLng: number) => {
    setNewCoords({ lat: newLat, lng: newLng });
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}`);
      const data = await res.json();
      if (data && data.display_name) {
        setNewAddressText(data.display_name);
      } else {
        setNewAddressText(`Alamat GPS (${newLat.toFixed(5)}, ${newLng.toFixed(5)}), Maleber`);
      }
    } catch {
      setNewAddressText(`Alamat GPS (${newLat.toFixed(5)}, ${newLng.toFixed(5)}), Maleber`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatar(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddAddress = () => {
    if (!newAddressText.trim()) return;
    const newAddr: SavedAddress = {
      id: `addr-${Date.now()}`,
      label: newLabel,
      name: newAddressText.trim(),
      lat: newCoords.lat,
      lng: newCoords.lng
    };
    setSavedAddresses((prev) => [...prev, newAddr]);
    setNewAddressText('');
    setShowAddAddr(false);
  };

  const handleDeleteAddress = (id: string) => {
    setSavedAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalSavedAddresses: SavedAddress[] = user.role === 'seller'
      ? [{ id: 'addr-store-1', label: 'Rumah' as const, name: `Toko: ${storeName || 'Toko UMKM'} - ${storeAddressText}`, lat: storeCoords.lat, lng: storeCoords.lng }]
      : savedAddresses;

    const updated: UserProfile = {
      ...user,
      name,
      phone,
      email,
      avatar,
      storeName: user.role === 'seller' ? storeName : user.storeName,
      vehicleInfo: user.role === 'driver' ? vehicleInfo : user.vehicleInfo,
      savedAddresses: finalSavedAddresses
    };

    onSaveProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const labelIcons = {
    Rumah: <Home className="w-3.5 h-3.5 text-emerald-500" />,
    Kantor: <Building className="w-3.5 h-3.5 text-blue-500" />,
    Sekolah: <GraduationCap className="w-3.5 h-3.5 text-amber-500" />,
    'Tempat Favorit': <MapPin className="w-3.5 h-3.5 text-rose-500" />
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 modal-overlay" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 space-y-5 shadow-2xl border border-zinc-200 dark:border-zinc-800 modal-content relative overflow-y-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white">Pengaturan Profil &amp; Alamat</h3>
              <p className="text-xs text-zinc-500">Kelola data diri &amp; daftar alamat favorit Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold flex items-center justify-center cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Custom Avatar Upload Section */}
          <div className="space-y-3 text-center">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">Foto Profil Anda:</label>
            
            <div className="relative w-20 h-20 mx-auto group">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  className="w-20 h-20 rounded-2xl object-cover ring-4 ring-emerald-500/30 shadow-lg mx-auto"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-2xl flex items-center justify-center ring-4 ring-emerald-500/30 shadow-lg mx-auto">
                  {name ? name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}

              <label className="absolute -bottom-1 -right-1 bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl shadow-md cursor-pointer transition-transform group-hover:scale-110">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            <div className="flex justify-center items-center gap-2 text-xs pt-1">
              <label className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-xl font-extrabold cursor-pointer transition-colors flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-emerald-600" /> Unggah Foto Dari Galeri
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="p-1.5 text-zinc-400 hover:text-emerald-600 transition-colors"
                title="Input via Link / URL"
              >
                <Link className="w-4 h-4" />
              </button>
            </div>

            {showUrlInput && (
              <input
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="Tempel URL foto profil (https://...)"
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            )}
          </div>

          {/* User Basic Info Fields */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Nama Lengkap:</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masukkan nama lengkap Anda"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Nomor WhatsApp / HP:</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@maleber.des.id"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!email || !email.includes('@')) {
                      alert('Masukkan alamat email yang valid terlebih dahulu!');
                      return;
                    }
                    try {
                      const res = await fetch('/api/send-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          to: email,
                          type: 'otp',
                          name: name || 'Warga Maleber',
                          otpCode: Math.floor(100000 + Math.random() * 900000).toString()
                        })
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        alert(`✅ Sukses! Email OTP uji coba Resend berhasil dikirim ke: ${email}`);
                      } else {
                        alert(`❌ Gagal: ${data.error || 'Gagal mengirim email via Resend'}`);
                      }
                    } catch (e: any) {
                      alert(`❌ Error: ${e.message}`);
                    }
                  }}
                  className="mt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  ✉️ Tes Kirim Email OTP (via Resend)
                </button>
              </div>
            </div>

            {/* Role Specific Extra Fields */}
            {user.role === 'seller' && (
              <div>
                <label className="text-xs font-bold text-amber-600 dark:text-amber-400 block mb-1">Nama Warung / Toko UMKM:</label>
                <div className="relative">
                  <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Contoh: Warung Liwet Ibu Imas"
                    className="w-full bg-amber-50/50 dark:bg-zinc-800 border border-amber-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {user.role === 'driver' && (
              <div>
                <label className="text-xs font-bold text-blue-600 dark:text-blue-400 block mb-1">Info Kendaraan Motor &amp; Plat Nomor:</label>
                <div className="relative">
                  <Bike className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                  <input
                    type="text"
                    value={vehicleInfo}
                    onChange={(e) => setVehicleInfo(e.target.value)}
                    placeholder="Contoh: Yamaha NMAX 155 (F 3312 WX)"
                    className="w-full bg-blue-50/50 dark:bg-zinc-800 border border-blue-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION: SELLER STORE LOCATION WITH MAP DROP PIN */}
          {user.role === 'seller' ? (
            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-3">
              <div className="flex justify-between items-center flex-wrap gap-1">
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-amber-500" /> Alamat &amp; Titik Lokasi Toko UMKM
                  </h4>
                  <p className="text-[11px] text-zinc-500">Tentukan posisi toko di peta untuk akurasi pengantaran kurir driver</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStoreMap(!showStoreMap)}
                  className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                    showStoreMap
                      ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-500'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                  }`}
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  {showStoreMap ? 'Tutup Peta' : '📌 Drop Pin Peta Toko'}
                </button>
              </div>

              {/* Interactive Leaflet Map Component for Seller Store */}
              {showStoreMap && (
                <div className="space-y-1.5 border border-amber-500/50 rounded-2xl overflow-hidden p-1 bg-amber-50 dark:bg-amber-950/40">
                  <span className="text-[10px] font-bold text-amber-900 dark:text-amber-200 px-2 block">
                    📍 Klik / geser titik pin merah untuk menandai posisi persis Toko UMKM Anda:
                  </span>
                  <div className="h-48 rounded-xl overflow-hidden shadow-inner">
                    <MapComponent
                      center={storeCoords}
                      zoom={16}
                      selectionMode="dest"
                      destLocation={{ lat: storeCoords.lat, lng: storeCoords.lng, address: storeAddressText }}
                      onSelectDest={(lat, lng) => handleStoreMarkerDragEnd(lat, lng)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">Detail Alamat Fisik Toko:</label>
                <input
                  type="text"
                  value={storeAddressText}
                  onChange={(e) => setStoreAddressText(e.target.value)}
                  placeholder="Contoh: Jl. Raya Maleber No. 12, RT 02/RW 01, Dusun Manis"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          ) : (
            /* SECTION: BUYER SAVED ADDRESSES WITH MAP DROP PIN */
            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" /> Alamat Favorit Tersimpan
                  </h4>
                  <p className="text-[11px] text-zinc-500">Memudahkan pilihan pengiriman &amp; ojek dalam 1-klik</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAddr(!showAddAddr)}
                  className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Alamat
                </button>
              </div>

              {/* Add New Address Input Form with Map Drop Pin */}
              {showAddAddr && (
                <div className="bg-emerald-50/60 dark:bg-zinc-800/80 p-3 rounded-xl border border-emerald-200 dark:border-zinc-700 space-y-2.5 animate-slide-down">
                  <div className="flex gap-2">
                    {(['Rumah', 'Kantor', 'Sekolah', 'Tempat Favorit'] as const).map((lbl) => (
                      <button
                        type="button"
                        key={lbl}
                        onClick={() => setNewLabel(lbl)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          newLabel === lbl ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>

                  {/* Interactive Leaflet Map for Buyer Add Address */}
                  {showAddrMap && (
                    <div className="space-y-1 border border-emerald-500/40 rounded-xl overflow-hidden p-1 bg-white dark:bg-zinc-900">
                      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 px-2 block">
                        📍 Klik / geser pin peta untuk tentukan lokasi {newLabel}:
                      </span>
                      <div className="h-40 rounded-lg overflow-hidden shadow-inner">
                        <MapComponent
                          center={newCoords}
                          zoom={16}
                          selectionMode="dest"
                          destLocation={{ lat: newCoords.lat, lng: newCoords.lng, address: newAddressText }}
                          onSelectDest={(lat, lng) => handleBuyerMarkerDragEnd(lat, lng)}
                        />
                      </div>
                    </div>
                  )}

                  <input
                    type="text"
                    value={newAddressText}
                    onChange={(e) => setNewAddressText(e.target.value)}
                    placeholder={`Masukkan alamat/patokan ${newLabel}...`}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddAddress}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 rounded-xl cursor-pointer"
                  >
                    Simpan Alamat Baru
                  </button>
                </div>
              )}

              {/* List of Saved Addresses */}
              <div className="space-y-2">
                {savedAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="flex items-center justify-between p-2.5 sm:p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/50 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shrink-0 font-extrabold text-emerald-600">
                        📍
                      </span>
                      <div className="min-w-0">
                        <span className="font-extrabold text-zinc-900 dark:text-white block">{addr.label}</span>
                        <span className="text-zinc-500 truncate block text-[11px]">{addr.name}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="p-1 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                      title="Hapus Alamat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: PENGATURAN APLIKASI (MODE TAMPILAN, NOTIFIKASI & DOMPET) */}
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-4">
            <h4 className="font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
              ⚙️ Pengaturan Aplikasi &amp; Notifikasi
            </h4>

            {/* Mode Tampilan Dark/Light */}
            {onToggleTheme && (
              <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/50 text-xs">
                <div className="flex items-center gap-2.5">
                  {theme === 'dark' ? (
                    <Moon className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Sun className="w-4 h-4 text-amber-500" />
                  )}
                  <div>
                    <span className="font-bold text-zinc-900 dark:text-white block">Mode Tampilan Aplikasi</span>
                    <span className="text-[11px] text-zinc-500">Saat ini: {theme === 'dark' ? 'Mode Gelap (Dark Mode)' : 'Mode Terang (Light Mode)'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl cursor-pointer shadow-sm transition-all"
                >
                  Ubah Mode
                </button>
              </div>
            )}

            {/* Notifikasi Sistem & Suara HP / PC */}
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/50 text-xs">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-blue-500" />
                <div>
                  <span className="font-bold text-zinc-900 dark:text-white block">Notifikasi Perangkat (HP &amp; PC)</span>
                  <span className="text-[11px] text-zinc-500">Bunyi sirine order &amp; notifikasi sistem OS</span>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  const granted = await requestSystemNotificationPermission();
                  if (granted) {
                    triggerSystemNotification('🔔 Tes Notifikasi Berhasil!', {
                      body: 'Sistem notifikasi HP & PC Anda sudah aktif dan siap menerima update orderan / pesan!',
                      soundType: 'order'
                    });
                  } else {
                    alert('Izin notifikasi ditolak oleh browser. Silakan aktifkan izin notifikasi di pengaturan browser Anda.');
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl cursor-pointer shadow-sm transition-all flex items-center gap-1"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Tes Notifikasi
              </button>
            </div>

            {/* Dompet Virtual Driver System Readiness Card (ONLY FOR DRIVERS) */}
            {user.role === 'driver' && (
              <div className="p-3.5 bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/30 rounded-2xl text-xs text-white space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <span className="font-extrabold text-emerald-300">Saldo Dompet Mitraseat Driver</span>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Sistem Siap
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-1">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Saldo Dompet Virtual:</span>
                    <span className="text-lg font-black text-white tabular-nums">Rp 50.000</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert('Sistem Dompet Virtual Driver Siap! Integrasi Midtrans Payment Gateway Top-Up akan dihubungkan.')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] px-3 py-1.5 rounded-xl cursor-pointer shadow-md transition-all"
                  >
                    + Top-Up Saldo
                  </button>
                </div>
              </div>
            )}

            {/* Account Security Verification Badges */}
            <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-emerald-900 dark:text-emerald-200">Status Keamanan Akun Warga:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30">
                  WA Verified ✅
                </span>
                <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-blue-500/30">
                  Email Verified ✅
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full font-black text-xs sm:text-sm py-3 sm:py-3.5 rounded-xl sm:rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer btn-ripple ${
              savedSuccess ? 'bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" /> Profil &amp; Alamat Tersimpan!
              </>
            ) : (
              'Simpan Perubahan Profil'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
