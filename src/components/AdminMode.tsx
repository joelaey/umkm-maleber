'use client';

import React, { useState } from 'react';
import { Store, DriverInfo, Order, RideRequest, UserRole, PlacePOI } from '@/types';
import MapComponent from './MapComponent';
import { INITIAL_PLACES } from '@/lib/mockData';
import { ShieldCheck, Store as StoreIcon, Bike, Users, FileText, CheckCircle2, TrendingUp, Layers, Plus, UserCheck, ShieldAlert, X, Building2, Crown, Lock, UserPlus, Key, Eye, Radio, Activity, MapPin, Sparkles } from 'lucide-react';

interface AdminModeProps {
  stores: Store[];
  drivers: DriverInfo[];
  orders: Order[];
  rides: RideRequest[];
  places?: PlacePOI[];
  onAddStoreByAdmin?: (newStore: Store) => void;
  onAddDriverByAdmin?: (newDriver: DriverInfo) => void;
  onSwitchRoleView?: (role: UserRole) => void;
}

export default function AdminMode({
  stores,
  drivers,
  orders,
  rides,
  places = INITIAL_PLACES,
  onAddStoreByAdmin,
  onAddDriverByAdmin,
  onSwitchRoleView
}: AdminModeProps) {
  const [activeAdminTab, setActiveAdminTab] = useState<'live' | 'verifikasi' | 'superadmin'>('live');
  
  // Modals
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [showAddOfficerModal, setShowAddOfficerModal] = useState(false);

  // Officers List (Petugas Desa registered by Super Admin)
  const [officers, setOfficers] = useState([
    { id: 'off-1', name: 'Pak Kades Maleber', email: 'kades@maleber.des.id', role: 'Petugas Desa (Admin)', status: 'Aktif', addedBy: 'Super Admin' },
    { id: 'off-2', name: 'Sekdes Maleber', email: 'sekdes@maleber.des.id', role: 'Petugas Desa (Admin)', status: 'Aktif', addedBy: 'Super Admin' }
  ]);

  // New Store Form State
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<Store['category']>('Kuliner');
  const [address, setAddress] = useState('');

  // New Driver Form State
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');

  // New Officer Form State (Super Admin Only)
  const [officerName, setOfficerName] = useState('');
  const [officerEmail, setOfficerEmail] = useState('');
  const [officerPass, setOfficerPass] = useState('');

  const totalVolume =
    orders.reduce((acc, curr) => acc + curr.totalAmount, 0) +
    rides.reduce((acc, curr) => acc + curr.fare, 0);

  const activeRidesCount = rides.filter((r) => r.status !== 'completed' && r.status !== 'cancelled').length;
  const activeOrdersCount = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length;
  const onlineDriversCount = drivers.filter((d) => d.isOnline).length;

  const handleCreateStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName || !ownerName) return;

    const newStore: Store = {
      id: `store-${Date.now().toString().slice(-4)}`,
      name: storeName,
      ownerName,
      phone: phone || '081234567890',
      category,
      address: address || 'Desa Maleber, Karangtengah, Cianjur',
      lat: -6.8155 + (Math.random() - 0.5) * 0.005,
      lng: 107.1865 + (Math.random() - 0.5) * 0.005,
      rating: 5.0,
      reviewCount: 1,
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
      isActive: true,
      description: 'Mitra UMKM resmi terverifikasi Pemerintah Desa Maleber.'
    };

    if (onAddStoreByAdmin) onAddStoreByAdmin(newStore);

    setStoreName('');
    setOwnerName('');
    setPhone('');
    setAddress('');
    setShowAddStoreModal(false);
  };

  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName || !vehicleNumber) return;

    const newDriver: DriverInfo = {
      id: `drv-${Date.now().toString().slice(-4)}`,
      name: driverName,
      phone: driverPhone || '081399887766',
      vehicleModel: vehicleModel || 'Honda Beat Hitam',
      vehicleNumber: vehicleNumber || 'F 1234 MBR',
      isOnline: true,
      lat: -6.8155 + (Math.random() - 0.5) * 0.004,
      lng: 107.1865 + (Math.random() - 0.5) * 0.004,
      rating: 5.0,
      reviewCount: 1
    };

    if (onAddDriverByAdmin) onAddDriverByAdmin(newDriver);

    setDriverName('');
    setDriverPhone('');
    setVehicleModel('');
    setVehicleNumber('');
    setShowAddDriverModal(false);
  };

  const handleAddOfficer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerName || !officerEmail) return;

    setOfficers((prev) => [
      ...prev,
      {
        id: `off-${Date.now().toString().slice(-4)}`,
        name: officerName,
        email: officerEmail,
        role: 'Petugas Desa (Admin)',
        status: 'Aktif',
        addedBy: 'Super Admin (Saya)'
      }
    ]);

    setOfficerName('');
    setOfficerEmail('');
    setOfficerPass('');
    setShowAddOfficerModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      
      {/* Super Admin Header */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-900 to-zinc-950 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-purple-500/20">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-purple-500 to-amber-500 text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-lg shadow-purple-500/30 shrink-0">
            <Crown className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black">Super Admin Command Center</h2>
              <span className="bg-amber-400 text-zinc-950 text-[10px] sm:text-xs font-black px-2.5 sm:px-3 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                <Crown className="w-3 h-3" /> Pemilik Sistem
              </span>
            </div>
            <p className="text-xs text-purple-200 mt-1 leading-relaxed">
              Live tracking seluruh aktivitas Desa Maleber &amp; tata kelola akun petugas desa.
            </p>
          </div>
        </div>

        <a
          href="/supabase-schema.sql"
          download="supabase-schema.sql"
          className="w-full sm:w-auto bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-2xl border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <FileText className="w-4 h-4 text-purple-300" />
          Download Supabase SQL Schema
        </a>
      </div>

      {/* Admin Sub Tab Switcher */}
      <div className="relative">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x border-b border-zinc-200 dark:border-zinc-800 -mx-3 px-3 sm:mx-0 sm:px-0">
          <button
            onClick={() => setActiveAdminTab('live')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap shrink-0 snap-start ${
              activeAdminTab === 'live'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Radio className="w-4 h-4 animate-pulse text-emerald-300 shrink-0" />
            <span>Live Radar &amp; Aktivitas</span>
            <span className="hidden md:inline">&nbsp;Realtime</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('verifikasi')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap shrink-0 snap-start ${
              activeAdminTab === 'verifikasi'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Kelola Mitra</span>
            <span className="hidden md:inline">&nbsp;UMKM &amp; Driver Desa</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('superadmin')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap shrink-0 snap-start ${
              activeAdminTab === 'superadmin'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Crown className="w-4 h-4 shrink-0 text-amber-300" />
            <span>Hak Akses Petugas</span>
            <span className="hidden md:inline">&nbsp;(Super Admin)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: LIVE TRACKING MAP & AKTIVITAS REALTIME */}
      {activeAdminTab === 'live' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Live Metrics Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-500 font-semibold">
                <span className="truncate">Driver Standby</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
              </div>
              <h4 className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate">
                {onlineDriversCount} <span className="text-xs sm:text-base font-bold">Active</span>
              </h4>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-500 font-semibold">
                <span className="truncate">Ojek Berjalan</span>
                <Bike className="w-4 h-4 text-blue-500 shrink-0" />
              </div>
              <h4 className="text-lg sm:text-2xl font-black text-blue-600 dark:text-blue-400 truncate">
                {activeRidesCount} <span className="text-xs sm:text-base font-bold">Trip</span>
              </h4>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-500 font-semibold">
                <span className="truncate">Order Kuliner</span>
                <StoreIcon className="w-4 h-4 text-amber-500 shrink-0" />
              </div>
              <h4 className="text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-400 truncate">
                {activeOrdersCount} <span className="text-xs sm:text-base font-bold">Order</span>
              </h4>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-500 font-semibold">
                <span className="truncate">Volume Desa</span>
                <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>
              <h4 className="text-base sm:text-2xl font-black text-zinc-900 dark:text-white truncate">
                Rp {totalVolume.toLocaleString('id-ID')}
              </h4>
            </div>
          </div>

          {/* Live Operations Map & Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
            
            {/* Live Map */}
            <div className="lg:col-span-8 space-y-2.5 sm:space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
                  Live GPS Radar Desa Maleber
                </h3>
                <span className="text-[11px] sm:text-xs text-emerald-600 font-bold flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border border-emerald-300/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live Realtime
                </span>
              </div>

              <MapComponent
                stores={stores}
                drivers={drivers}
                places={places}
                pickupLocation={rides[0] ? { lat: rides[0].pickupLat, lng: rides[0].pickupLng, address: rides[0].pickupAddress } : null}
                destLocation={rides[0] ? { lat: rides[0].destLat, lng: rides[0].destLng, address: rides[0].destAddress } : null}
                driverProgress={75}
                className="h-[320px] sm:h-[480px] w-full rounded-2xl sm:rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800"
              />
            </div>

            {/* Live Activity Stream Feed */}
            <div className="lg:col-span-4 bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 h-[360px] sm:h-[510px] overflow-y-auto">
              <h4 className="font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-white flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <Activity className="w-4 h-4 text-amber-500 shrink-0" />
                Stream Aktivitas Desa Live
              </h4>

              <div className="space-y-2.5 sm:space-y-3 stagger-children">
                {[...rides]
                  .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                  .map((r) => (
                    <div key={r.id} className="p-2.5 sm:p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl sm:rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-black px-2 py-0.5 rounded-md text-[10px]">
                          🛵 OJEK PENUMPANG
                        </span>
                        <span className="text-zinc-400 text-[10px]">Baru Saja</span>
                      </div>
                      <p className="font-bold text-zinc-900 dark:text-white mt-1 leading-snug">
                        {r.passengerName} memesan ojek ke {r.destAddress}
                      </p>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold block text-[11px]">Tarif: Rp {r.fare.toLocaleString('id-ID')}</span>
                    </div>
                  ))}

                {[...orders]
                  .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                  .map((o) => (
                  <div key={o.id} className="p-2.5 sm:p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl sm:rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-black px-2 py-0.5 rounded-md text-[10px]">
                        🍲 KULINER UMKM
                      </span>
                      <span className="text-zinc-400 text-[10px]">Baru Saja</span>
                    </div>
                    <p className="font-bold text-zinc-900 dark:text-white mt-1 leading-snug">
                      {o.buyerName} memesan dari {o.storeName}
                    </p>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold block text-[11px]">Total: Rp {o.totalAmount.toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: VERIFIKASI MITRA DESA */}
      {activeAdminTab === 'verifikasi' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Official Village Regulation Banner */}
          <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 sm:p-4 rounded-2xl border border-amber-200 dark:border-amber-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 shrink-0" />
              <div>
                <h4 className="font-extrabold text-amber-900 dark:text-amber-200">Wewenang Pendaftaran Mitra Desa</h4>
                <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                  Pendaftaran UMKM &amp; Driver Ojek dilakukan oleh <strong>Petugas Desa</strong> setelah verifikasi fisik berkas (KTP, SKU / SIM).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0">
              <button
                onClick={() => setShowAddStoreModal(true)}
                className="flex-1 sm:flex-none bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> Daftarkan UMKM
              </button>
              <button
                onClick={() => setShowAddDriverModal(true)}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> Daftarkan Driver
              </button>
            </div>
          </div>

          {/* Stores & Drivers Verification Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Registered Stores */}
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-white flex items-center gap-2">
                  <StoreIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
                  Daftar UMKM Mitra Desa ({stores.length})
                </h3>
                <button
                  onClick={() => setShowAddStoreModal(true)}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah UMKM
                </button>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {stores.map((s) => (
                  <div key={s.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={s.image} alt={s.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                      <div className="min-w-0">
                        <h5 className="font-bold text-sm text-zinc-900 dark:text-white truncate">{s.name}</h5>
                        <p className="text-xs text-zinc-500 truncate">{s.category} &bull; Owner: {s.ownerName}</p>
                      </div>
                    </div>
                    <span className="self-start sm:self-auto bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 border border-emerald-300/40">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> SKU Verifikasi Desa
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Registered Drivers */}
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-white flex items-center gap-2">
                  <Bike className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
                  Daftar Driver Ojek Desa ({drivers.length})
                </h3>
                <button
                  onClick={() => setShowAddDriverModal(true)}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Driver
                </button>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {drivers.map((d) => (
                  <div key={d.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-300/30">
                        🛵
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-sm text-zinc-900 dark:text-white truncate">{d.name}</h5>
                        <p className="text-xs text-zinc-500 truncate">{d.vehicleModel} ({d.vehicleNumber})</p>
                      </div>
                    </div>
                    <span className="self-start sm:self-auto bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 border border-emerald-300/40">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> SIM &amp; STNK Terverifikasi
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUPER ADMIN ROLE GOVERNANCE */}
      {activeAdminTab === 'superadmin' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-gradient-to-br from-amber-950/40 via-zinc-900 to-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-amber-500/30 text-white space-y-3 sm:space-y-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black shrink-0">
                <Crown className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <span className="bg-amber-400 text-zinc-950 font-black text-[9px] sm:text-[10px] px-2.5 py-0.5 rounded-full uppercase">
                  Wewenang Khusus Super Admin (Pemilik Sistem)
                </span>
                <h3 className="text-lg sm:text-xl font-black mt-1">Manajemen Role Petugas Desa Maleber</h3>
              </div>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed max-w-3xl">
              Role <strong>Petugas Desa (Admin)</strong> memiliki hak akses untuk menerima berkas, mendaftarkan toko UMKM, dan menyetujui driver ojek. 
              Pemberian role Petugas Desa ini hanya dapat dilakukan oleh Anda sebagai <strong>Super Admin</strong>.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
                  Daftar Akun Petugas Desa Terdaftar ({officers.length})
                </h4>
                <p className="text-xs text-zinc-500">Petugas desa yang berhak mengelola pendaftaran UMKM &amp; Driver</p>
              </div>

              <button
                onClick={() => setShowAddOfficerModal(true)}
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <UserPlus className="w-4 h-4" />
                Tambah Petugas Desa Baru
              </button>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {officers.map((off) => (
                <div key={off.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold text-sm shrink-0 border border-purple-300/30">
                      🏛️
                    </div>
                    <div className="min-w-0">
                      <h5 className="font-bold text-sm text-zinc-900 dark:text-white truncate">{off.name}</h5>
                      <p className="text-xs text-zinc-500 truncate">{off.email} &bull; Ditambahkan oleh: {off.addedBy}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span className="bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 text-[11px] font-bold px-3 py-1 rounded-full border border-purple-300/40">
                      {off.role}
                    </span>
                    <span className="bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold px-3 py-1 rounded-full border border-emerald-300/40">
                      ● {off.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PETUGAS DESA: DAFTARKAN STORE BARU */}
      {showAddStoreModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 modal-overlay overflow-y-auto" onClick={() => setShowAddStoreModal(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl border border-zinc-200 dark:border-zinc-800 modal-content my-auto max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-300/40">
                  Formulir Petugas Desa
                </span>
                <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white mt-1">Daftarkan Toko UMKM Baru</h3>
              </div>
              <button onClick={() => setShowAddStoreModal(false)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateStore} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Nama Toko / Warung UMKM</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Warung Seblak Ibu Cucun"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Nama Pemilik (Sesuai KTP Maleber)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ibu Cucun Maleber"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No. WhatsApp Pemilik</label>
                <input
                  type="tel"
                  placeholder="081234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Kategori Usaha</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                >
                  <option value="Kuliner">Kuliner</option>
                  <option value="Hasil Tani">Hasil Tani</option>
                  <option value="Kerajinan">Kerajinan</option>
                  <option value="Toko Kelontong">Toko Kelontong</option>
                </select>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300">
                ✔️ Berkas SKU &amp; KTP Warga telah diverifikasi oleh Petugas Desa.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStoreModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-700 cursor-pointer shadow-md"
                >
                  Simpan &amp; Terbitkan UMKM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PETUGAS DESA: DAFTARKAN DRIVER BARU */}
      {showAddDriverModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 modal-overlay overflow-y-auto" onClick={() => setShowAddDriverModal(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl border border-zinc-200 dark:border-zinc-800 modal-content my-auto max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-300/40">
                  Formulir Petugas Desa
                </span>
                <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white mt-1">Daftarkan Driver Ojek Desa</h3>
              </div>
              <button onClick={() => setShowAddDriverModal(false)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateDriver} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Nama Driver Ojek</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kang Yayan Ojek Maleber"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No. WhatsApp Driver</label>
                <input
                  type="tel"
                  placeholder="081399887766"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Model Motor</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Honda Beat Hitam"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Plat Nomor Kendaraan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: F 4521 YZ"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300">
                ✔️ Berkas SIM C, STNK &amp; KTP telah diverifikasi oleh Petugas Desa.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDriverModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-md"
                >
                  Simpan &amp; Aktifkan Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUPER ADMIN: BUAT AKUN PETUGAS DESA */}
      {showAddOfficerModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 modal-overlay overflow-y-auto" onClick={() => setShowAddOfficerModal(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl border border-zinc-200 dark:border-zinc-800 modal-content my-auto max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded-full flex items-center gap-1 w-max border border-amber-300/40">
                  <Crown className="w-3 h-3 text-amber-500" /> Akses Super Admin
                </span>
                <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white mt-1">Buat Role Petugas Desa Baru</h3>
              </div>
              <button onClick={() => setShowAddOfficerModal(false)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAddOfficer} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Nama Petugas Desa</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pak Kaur Keuangan Maleber"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Email Resmi Petugas</label>
                <input
                  type="email"
                  required
                  placeholder="petugas@maleber.des.id"
                  value={officerEmail}
                  onChange={(e) => setOfficerEmail(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Password Sementara</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={officerPass}
                  onChange={(e) => setOfficerPass(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                />
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300">
                🔑 Akun ini akan diberi role <strong>Petugas Desa (Admin)</strong> dengan wewenang verifikasi UMKM &amp; Driver Ojek Maleber.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddOfficerModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-700 cursor-pointer shadow-md"
                >
                  Terbitkan Akun Petugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
