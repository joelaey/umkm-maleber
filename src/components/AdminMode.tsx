'use client';

import React, { useState } from 'react';
import { Store, DriverInfo, Order, RideRequest, UserRole, PlacePOI } from '@/types';
import MapComponent from './MapComponent';
import { INITIAL_PLACES } from '@/lib/mockData';
import { ShieldCheck, Store as StoreIcon, Bike, Users, FileText, CheckCircle2, TrendingUp, Layers, Plus, UserCheck, ShieldAlert, X, Building2, Crown, Lock, UserPlus, Key, Eye, Radio, Activity, MapPin, Sparkles, Edit, Trash2 } from 'lucide-react';
import { calculateOrderFees, calculateRideFees, SELLER_COMMISSION_RATE, DRIVER_COMMISSION_RATE, BUYER_APP_FEE, formatRupiah } from '@/lib/feeCalculator';

interface AdminModeProps {
  stores: Store[];
  drivers: DriverInfo[];
  orders: Order[];
  rides: RideRequest[];
  places?: PlacePOI[];
  isPetugasDesa?: boolean;
  users?: any[];
  onAddStoreByAdmin?: (newStore: Store) => void;
  onAddDriverByAdmin?: (newDriver: DriverInfo) => void;
  onDeleteUserByAdmin?: (userId: string, email?: string) => void;
  onSwitchRoleView?: (role: UserRole) => void;
}

export default function AdminMode({
  stores,
  drivers,
  orders,
  rides,
  places = INITIAL_PLACES,
  isPetugasDesa = true,
  users = [],
  onAddStoreByAdmin,
  onAddDriverByAdmin,
  onDeleteUserByAdmin,
  onSwitchRoleView
}: AdminModeProps) {
  const [activeAdminTab, setActiveAdminTab] = useState<'monitoring' | 'management' | 'superadmin'>('monitoring');
  const [selectedAdminDetail, setSelectedAdminDetail] = useState<{
    type: 'order' | 'ride';
    data: Order | RideRequest;
  } | null>(null);
  
  // Modals
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [showAddOfficerModal, setShowAddOfficerModal] = useState(false);

  // Officers List (Petugas Desa registered by Super Admin)
  const [officers, setOfficers] = useState([
    { id: 'off-1', name: 'Pak Kades Maleber', email: 'kades@maleber.des.id', role: 'Petugas Desa (Admin)', status: 'Aktif', addedBy: 'Super Admin' },
    { id: 'off-2', name: 'Sekdes Maleber', email: 'sekdes@maleber.des.id', role: 'Petugas Desa (Admin)', status: 'Aktif', addedBy: 'Super Admin' }
  ]);

  // New Store Form State (with Dusun, RT, RW & Map Location Picker)
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<Store['category']>('Kuliner');
  const [address, setAddress] = useState('');
  const [dusun, setDusun] = useState('Manis');
  const [rt, setRt] = useState('01');
  const [rw, setRw] = useState('01');
  const [storeCoords, setStoreCoords] = useState<{ lat: number; lng: number }>({ lat: -6.8175, lng: 107.1878 });
  const [showStoreMapPicker, setShowStoreMapPicker] = useState(false);

  // New Driver Form State
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');

  // New Officer Form State (Super Admin Only)
  const [officerName, setOfficerName] = useState('');
  const [officerEmail, setOfficerEmail] = useState('');
  const [officerPass, setOfficerPass] = useState('');

  // Super Admin Full User Management State (Synced with Supabase public.profiles)
  const [allUsers, setAllUsers] = useState<any[]>(users && users.length > 0 ? users : [
    { id: 'off-1', name: 'Pak Kades Maleber', email: 'kades@maleber.des.id', phone: '081234567890', role: 'admin', status: 'Aktif' },
    { id: 'off-2', name: 'Sekdes Maleber', email: 'sekdes@maleber.des.id', phone: '081234567891', role: 'admin', status: 'Aktif' },
    { id: 'usr-seller-1', name: 'Ibu Imas (Warung Liwet)', email: 'imas@maleber.des.id', phone: '081234567892', role: 'seller', status: 'Aktif' },
    { id: 'usr-driver-1', name: 'Kang Yayan Driver', email: 'yayan@maleber.des.id', phone: '081399887766', role: 'driver', status: 'Aktif' },
    { id: 'usr-buyer-1', name: 'Teh Rina Warga', email: 'rina@maleber.des.id', phone: '081299887766', role: 'buyer', status: 'Aktif' }
  ]);

  React.useEffect(() => {
    if (users && users.length > 0) {
      setAllUsers(users);
    }
  }, [users]);

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // New User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('admin');

  // Edit User Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('admin');

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName) return;
    const created = {
      id: `usr-${Date.now().toString().slice(-4)}`,
      name: newUserName,
      email: newUserEmail || `${newUserName.toLowerCase().replace(/\s+/g, '')}@maleber.des.id`,
      phone: newUserPhone || '081234567890',
      role: newUserRole,
      status: 'Aktif'
    };
    setAllUsers((prev) => [created, ...prev]);

    // Push to Supabase PostgreSQL via API
    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_profile', data: created })
    }).catch((err) => console.warn('Failed to push created user to Supabase:', err));

    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setShowAddUserModal(false);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const updated = { ...editingUser, name: editName, email: editEmail, phone: editPhone, role: editRole };
    setAllUsers((prev) =>
      prev.map((u) => (u.id === editingUser.id ? updated : u))
    );

    // Push update to Supabase PostgreSQL via API
    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_profile',
        data: {
          id: editingUser.id,
          name: editName,
          email: editEmail,
          phone: editPhone,
          role: editRole
        }
      })
    }).catch((err) => console.warn('Failed to update user in Supabase:', err));

    setEditingUser(null);
  };

  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string; email?: string } | null>(null);

  const confirmDeleteUser = () => {
    if (!userToDelete) return;
    const targetId = userToDelete.id;
    const targetEmail = userToDelete.email;

    setAllUsers((prev) => prev.filter((u) => u.id !== targetId && u.email !== targetEmail));

    if (onDeleteUserByAdmin) {
      onDeleteUserByAdmin(targetId, targetEmail);
    }

    // Push delete to Supabase PostgreSQL via API
    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_profile',
        data: {
          id: targetId,
          email: targetEmail
        }
      })
    }).catch((err) => console.warn('Failed to delete user from Supabase:', err));

    setUserToDelete(null);
  };

  const totalVolume =
    orders.reduce((acc, curr) => acc + curr.totalAmount, 0) +
    rides.reduce((acc, curr) => acc + curr.fare, 0);

  const activeRidesCount = rides.filter((r) => r.status !== 'completed' && r.status !== 'cancelled').length;
  const activeOrdersCount = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length;
  const onlineDriversCount = drivers.filter((d) => d.isOnline).length;

  // Platform Revenue Calculation
  const completedOrders = orders.filter(o => o.status === 'completed');
  const completedRides = rides.filter(r => r.status === 'completed');

  const platformRevenueFromOrders = completedOrders.reduce((acc, ord) => {
    const productSubtotal = ord.totalAmount - (ord.deliveryFee || 5000);
    const fees = calculateOrderFees(productSubtotal, ord.deliveryFee || 5000);
    return acc + fees.platformRevenue;
  }, 0);

  const platformRevenueFromRides = completedRides.reduce((acc, ride) => {
    const fees = calculateRideFees(ride.fare);
    return acc + fees.platformRevenue;
  }, 0);

  const totalPlatformRevenue = platformRevenueFromOrders + platformRevenueFromRides;

  const handleCreateStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName || !ownerName) return;

    const fullAddress = `${address || 'Jl. Raya Maleber'}, Dusun ${dusun}, RT ${rt}/RW ${rw}, Maleber`;

    const newStore: Store = {
      id: `store-${Date.now().toString().slice(-4)}`,
      name: storeName,
      ownerName,
      phone: phone || '081234567890',
      category,
      address: fullAddress,
      lat: storeCoords.lat,
      lng: storeCoords.lng,
      isActive: true,
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
      description: `Toko UMKM ${category} di Dusun ${dusun}, RT ${rt}/RW ${rw}, Desa Maleber`,
      rating: 0,
      reviewCount: 0
    };

    if (onAddStoreByAdmin) onAddStoreByAdmin(newStore);

    setStoreName('');
    setOwnerName('');
    setPhone('');
    setAddress('');
    setDusun('Manis');
    setRt('01');
    setRw('01');
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

  if (showStoreMapPicker) {
    return (
      <div className="fixed inset-0 z-[999999] bg-black">
        <div className="absolute inset-0">
          <MapComponent
            className="h-full w-full"
            center={storeCoords}
            zoom={17}
            selectionMode="dest"
            destLocation={{ lat: storeCoords.lat, lng: storeCoords.lng, address: 'Titik Lokasi Toko UMKM Baru' }}
            onSelectDest={(lat, lng) => {
              setStoreCoords({ lat, lng });
            }}
          />
        </div>

        {/* Floating Header Bar */}
        <div className="absolute top-4 left-4 right-4 z-[1000000] flex items-center justify-between gap-3 bg-zinc-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-zinc-700 shadow-2xl text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <MapPin className="w-5 h-5 text-emerald-400 shrink-0 animate-bounce" />
            <div className="min-w-0">
              <h4 className="font-extrabold text-xs sm:text-sm truncate">Tandai Titik Lokasi Toko di Map</h4>
              <p className="text-[10px] text-zinc-400 truncate">Geser atau ketuk peta untuk menyesuaikan koordinat toko UMKM</p>
            </div>
          </div>
          <button
            onClick={() => setShowStoreMapPicker(false)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-4 py-2 rounded-xl transition-all shadow-lg shrink-0 cursor-pointer"
          >
            ✓ Simpan Titik Lokasi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      
      {/* Header (Different for Petugas Desa vs Super Admin) */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-900 to-zinc-950 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-purple-500/20">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-purple-500 to-amber-500 text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-lg shadow-purple-500/30 shrink-0">
            {isPetugasDesa ? <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8" /> : <Crown className="w-6 h-6 sm:w-8 sm:h-8" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black">
                {isPetugasDesa ? 'Pusat Pemantauan Lapangan (Petugas Desa)' : 'Super Admin Command Center'}
              </h2>
              <span className="bg-amber-400 text-zinc-950 text-[10px] sm:text-xs font-black px-2.5 sm:px-3 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                {isPetugasDesa ? (
                  <><ShieldCheck className="w-3 h-3" /> Petugas Desa Maleber</>
                ) : (
                  <><Crown className="w-3 h-3" /> Pemilik Sistem</>
                )}
              </span>
            </div>
            <p className="text-xs text-purple-200 mt-1 leading-relaxed">
              {isPetugasDesa
                ? 'Pemantauan aktivitas operasional transaksi, orderan kuliner &amp; ojek warga Desa Maleber.'
                : 'Live tracking seluruh aktivitas Desa Maleber &amp; tata kelola akun petugas desa.'}
            </p>
          </div>
        </div>

        {!isPetugasDesa && (
          <a
            href="/supabase-schema.sql"
            download="supabase-schema.sql"
            className="w-full sm:w-auto bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-2xl border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <FileText className="w-4 h-4 text-purple-300" />
            Download Supabase SQL Schema
          </a>
        )}
      </div>

      {/* Admin Sub Tab Switcher */}
      <div className="relative">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x border-b border-zinc-200 dark:border-zinc-800 -mx-3 px-3 sm:mx-0 sm:px-0">
          <button
            onClick={() => setActiveAdminTab('monitoring')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap shrink-0 snap-start ${
              activeAdminTab === 'monitoring'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Radio className="w-4 h-4 animate-pulse text-emerald-300 shrink-0" />
            <span>Aktivitas Lapangan</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('management')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap shrink-0 snap-start ${
              activeAdminTab === 'management'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Kelola Mitra</span>
            <span className="hidden md:inline">&nbsp;UMKM &amp; Driver Desa</span>
          </button>

          {!isPetugasDesa && (
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
          )}
        </div>
      </div>

      {/* TAB 1: LIVE TRACKING MAP & AKTIVITAS REALTIME */}
      {activeAdminTab === 'monitoring' && (
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
                <span className="truncate">{isPetugasDesa ? 'Toko UMKM Aktif' : 'Volume Desa'}</span>
                <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>
              <h4 className="text-base sm:text-2xl font-black text-zinc-900 dark:text-white truncate">
                {isPetugasDesa ? `${stores.length} UMKM` : formatRupiah(totalVolume)}
              </h4>
            </div>
          </div>

          {/* Platform Revenue Card (Super Admin Only) */}
          {!isPetugasDesa && (
            <div className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-lg shadow-purple-600/20 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-purple-200">💰 Total Pendapatan Platform Maleber</p>
                  <h3 className="text-2xl sm:text-3xl font-black mt-1">{formatRupiah(totalPlatformRevenue)}</h3>
                  <p className="text-[10px] text-purple-200 mt-1">
                    Dari {completedOrders.length} pesanan + {completedRides.length} ojek yang selesai
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/10 backdrop-blur px-3 py-2 rounded-xl">
                    <p className="text-[10px] font-bold text-purple-200">Biaya Aplikasi</p>
                    <p className="text-sm font-black">{formatRupiah((completedOrders.length + completedRides.length) * BUYER_APP_FEE)}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur px-3 py-2 rounded-xl">
                    <p className="text-[10px] font-bold text-purple-200">Komisi Seller ({(SELLER_COMMISSION_RATE * 100).toFixed(0)}%)</p>
                    <p className="text-sm font-black">{formatRupiah(completedOrders.reduce((a, o) => a + calculateOrderFees(o.totalAmount - (o.deliveryFee || 5000)).sellerCommission, 0))}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur px-3 py-2 rounded-xl">
                    <p className="text-[10px] font-bold text-purple-200">Komisi Driver ({(DRIVER_COMMISSION_RATE * 100).toFixed(0)}%)</p>
                    <p className="text-sm font-black">{formatRupiah(
                      completedOrders.reduce((a, o) => a + calculateOrderFees(0, o.deliveryFee || 5000).driverCommission, 0) +
                      completedRides.reduce((a, r) => a + calculateRideFees(r.fare).driverCommission, 0)
                    )}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Operations Activity Stream */}
          <div className="space-y-4">
            {/* Live Activity Stream Feed */}
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 max-h-[600px] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <h4 className="font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-500 shrink-0" />
                  Stream Aktivitas Lapangan Desa
                </h4>
                <span className="text-[10px] font-bold text-zinc-400">Terbaru &bull; Ongoing Pertama</span>
              </div>

              <div className="space-y-2.5 sm:space-y-3">
                {(() => {
                  const combined = [
                    ...rides.map((r) => ({
                      type: 'ride' as const,
                      id: r.id,
                      data: r,
                      title: `${r.passengerName} memesan ojek ke ${r.destAddress}`,
                      tag: '🛵 OJEK PENUMPANG',
                      badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
                      subtext: `Status: ${r.status.toUpperCase()}`,
                      status: r.status,
                      createdAt: r.createdAt || '',
                      isOngoing: r.status !== 'completed' && r.status !== 'cancelled'
                    })),
                    ...orders.map((o) => ({
                      type: 'order' as const,
                      id: o.id,
                      data: o,
                      title: `${o.buyerName} memesan dari ${o.storeName}`,
                      tag: '🍲 KULINER UMKM',
                      badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                      subtext: `Status: ${o.status.toUpperCase()}`,
                      status: o.status,
                      createdAt: o.createdAt || '',
                      isOngoing: o.status !== 'completed' && o.status !== 'cancelled'
                    }))
                  ].sort((a, b) => {
                    if (a.isOngoing && !b.isOngoing) return -1;
                    if (!a.isOngoing && b.isOngoing) return 1;
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                  });

                  if (combined.length === 0) {
                    return (
                      <p className="text-xs text-zinc-400 text-center py-6">Belum ada aktivitas di desa Maleber.</p>
                    );
                  }

                  return combined.map((act) => (
                    <div
                      key={act.id}
                      onClick={() => setSelectedAdminDetail({ type: act.type, data: act.data as any })}
                      className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer group ${
                        act.isOngoing
                          ? 'bg-white dark:bg-zinc-900 border-2 border-emerald-500/80 shadow-md opacity-100'
                          : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/70 dark:border-zinc-800 opacity-50 grayscale-[20%]'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`font-black px-2 py-0.5 rounded-md text-[10px] ${act.badgeBg}`}>
                          {act.tag}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          act.isOngoing
                            ? 'bg-emerald-500 text-white animate-pulse'
                            : act.status === 'cancelled'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300/40'
                              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                        }`}>
                          {act.isOngoing ? '● SEDANG BERLANGSUNG' : act.status === 'cancelled' ? '✕ DIBATALKAN' : '✓ SELESAI'}
                        </span>
                      </div>
                      <p className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white mt-1.5 leading-snug group-hover:text-emerald-600 transition-colors">
                        {act.title}
                      </p>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-[11px]">
                        <span className="text-zinc-500 font-semibold">{act.subtext}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">Inspeksi &rarr;</span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: VERIFIKASI MITRA DESA */}
      {activeAdminTab === 'management' && (
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
                {stores.map((s) => {
                  const storeCompletedOrders = orders.filter((o) => o.storeId === s.id && o.status === 'completed');
                  const storeTotalNetIncome = storeCompletedOrders.reduce((acc, curr) => {
                    const productSubtotal = curr.totalAmount - (curr.deliveryFee || 5000);
                    const fees = calculateOrderFees(productSubtotal);
                    return acc + fees.sellerNetIncome;
                  }, 0);

                  return (
                    <div key={s.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={s.image} alt={s.name} className="w-12 h-12 rounded-xl object-cover shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-700" />
                        <div className="min-w-0">
                          <h5 className="font-bold text-sm text-zinc-900 dark:text-white truncate">{s.name}</h5>
                          <p className="text-xs text-zinc-500 truncate">{s.category} &bull; Owner: {s.ownerName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                              Pendapatan UMKM: {formatRupiah(storeTotalNetIncome)}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-semibold">
                              ({storeCompletedOrders.length} Order Selesai)
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="self-start sm:self-auto bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 border border-emerald-300/40">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> SKU Verifikasi Desa
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Registered Drivers */}
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-white flex items-center gap-2">
                  <Bike className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
                  Daftar Driver Ojek Desa ({drivers.length}) &bull; {drivers.filter(d => d.isOnline).length} Online
                </h3>
                <button
                  onClick={() => setShowAddDriverModal(true)}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Driver
                </button>
              </div>

              <div className="space-y-3">
                {[...drivers]
                  .sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0))
                  .map((d) => {
                    const driverRides = rides.filter(r => r.driverId === d.id && r.status === 'completed');
                    const driverOrders = orders.filter(o => o.driverId === d.id && o.status === 'completed');
                    const driverEarnings = driverRides.reduce((a, r) => a + r.fare, 0) + driverOrders.reduce((a, o) => a + o.deliveryFee, 0);
                    const activeJob = rides.find(r => r.driverId === d.id && r.status !== 'completed' && r.status !== 'cancelled') ||
                                      orders.find(o => o.driverId === d.id && o.status !== 'completed' && o.status !== 'cancelled');
                    return (
                      <div key={d.id} className={`p-3.5 rounded-2xl border text-xs space-y-2.5 transition-all ${
                        d.isOnline
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300/50 dark:border-emerald-700/50'
                          : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200/60 dark:border-zinc-700/50 opacity-70'
                      }`}>
                        {/* Header Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 border ${
                              d.isOnline ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300/30 text-emerald-700' : 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300/30 text-zinc-500'
                            }`}>
                              🛵
                            </div>
                            <div>
                              <h5 className="font-extrabold text-sm text-zinc-900 dark:text-white">{d.name}</h5>
                              <p className="text-zinc-500 text-[11px]">{d.vehicleModel} &bull; {d.vehicleNumber}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                            d.isOnline
                              ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm shadow-emerald-400/30'
                              : 'bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 border-zinc-300/40'
                          }`}>
                            {d.isOnline ? '● ONLINE' : '○ OFFLINE'}
                          </span>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-white dark:bg-zinc-900 p-2 rounded-xl text-center border border-zinc-200/60 dark:border-zinc-700/50">
                            <span className="text-amber-500 font-black text-sm block">⭐ {d.rating}</span>
                            <span className="text-zinc-500 text-[10px]">{d.reviewCount} ulasan</span>
                          </div>
                          <div className="bg-white dark:bg-zinc-900 p-2 rounded-xl text-center border border-zinc-200/60 dark:border-zinc-700/50">
                            <span className="text-blue-600 dark:text-blue-400 font-black text-sm block">{driverRides.length + driverOrders.length}</span>
                            <span className="text-zinc-500 text-[10px]">Trip Selesai</span>
                          </div>
                          <div className="bg-white dark:bg-zinc-900 p-2 rounded-xl text-center border border-zinc-200/60 dark:border-zinc-700/50">
                            <span className="text-emerald-600 dark:text-emerald-400 font-black text-[11px] block">Rp {driverEarnings.toLocaleString('id-ID')}</span>
                            <span className="text-zinc-500 text-[10px]">Penghasilan</span>
                          </div>
                        </div>

                        {/* Location / Job Info */}
                        {d.isOnline && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60">
                              📍 GPS: {d.lat.toFixed(4)}, {d.lng.toFixed(4)}
                            </span>
                            {activeJob ? (
                              <span className="text-[10px] font-extrabold text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/70 px-2 py-1 rounded-lg border border-blue-300/40 flex items-center gap-1">
                                🔄 Sedang Ada Job Aktif
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-2 py-1 rounded-lg border border-emerald-300/40">
                                ✅ Standby Siap Terima Order
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUPER ADMIN FULL USER MANAGEMENT & GOVERNANCE */}
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
                <h3 className="text-lg sm:text-xl font-black mt-1">Manajemen &amp; Hak Akses Penuh Seluruh User Sistem</h3>
              </div>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed max-w-3xl">
              Sebagai <strong>Super Admin (Pemilik Pemrograman &amp; Sistem)</strong>, Anda memiliki hak wewenang penuh untuk <strong>Menambahkan User Baru</strong>, <strong>Mengedit Profil &amp; Role User</strong>, serta <strong>Menghapus Akun User (Delete)</strong> di seluruh platform Maleber.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            {(() => {
              const managedUsers = allUsers.filter((u) => u.role !== 'superadmin');

              return (
                <>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-white flex items-center gap-2">
                        <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
                        Kelola Pengguna Sistem ({managedUsers.length} Terdaftar)
                      </h4>
                      <p className="text-xs text-zinc-500">Petugas Desa, Penjual Toko, Driver Ojek, dan Pembeli</p>
                    </div>

                    <button
                      onClick={() => setShowAddUserModal(true)}
                      className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <UserPlus className="w-4 h-4" />
                      Tambah User Sistem Baru
                    </button>
                  </div>

                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {managedUsers.map((u) => {
                      const roleLabels: Record<string, string> = {
                        admin: 'Petugas Desa (Admin)',
                        seller: 'Penjual (UMKM)',
                        driver: 'Driver (Ojek)',
                        buyer: 'Pembeli (Warga)'
                      };

                      const roleBadges: Record<string, string> = {
                        admin: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300/40',
                        seller: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300/40',
                        driver: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300/40',
                        buyer: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300/40'
                      };

                      return (
                        <div key={u.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center font-bold text-sm shrink-0 border border-zinc-200 dark:border-zinc-700">
                              {u.role === 'admin' ? '🏛️' : u.role === 'seller' ? '🏪' : u.role === 'driver' ? '🛵' : '👤'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-sm text-zinc-900 dark:text-white truncate">{u.name}</h5>
                                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${roleBadges[u.role] || 'bg-zinc-200 text-zinc-700'}`}>
                                  {roleLabels[u.role] || u.role}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-500 truncate mt-0.5">{u.email} &bull; WA: {u.phone}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setEditName(u.name);
                                setEditEmail(u.email);
                                setEditPhone(u.phone);
                                setEditRole(u.role);
                              }}
                              className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer border border-zinc-200 dark:border-zinc-700"
                            >
                              <Edit className="w-3.5 h-3.5 text-blue-500" />
                              Edit User
                            </button>

                            <button
                              onClick={() => setUserToDelete({ id: u.id, name: u.name, email: u.email })}
                              className="bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/70 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-300 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer border border-rose-300/40"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              Hapus
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
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

              {/* Dusun, RT & RW Fields */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Dusun</label>
                  <select
                    value={dusun}
                    onChange={(e) => setDusun(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1"
                  >
                    <option value="Manis">Dusun Manis</option>
                    <option value="Pahing">Dusun Pahing</option>
                    <option value="Kliwon">Dusun Kliwon</option>
                    <option value="Wage">Dusun Wage</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">RT</label>
                  <input
                    type="text"
                    placeholder="01"
                    value={rt}
                    onChange={(e) => setRt(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">RW</label>
                  <input
                    type="text"
                    placeholder="01"
                    value={rw}
                    onChange={(e) => setRw(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1"
                  />
                </div>
              </div>

              {/* Alamat Jalan / Detail */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Alamat Jalan / Patokan Usaha</label>
                <input
                  type="text"
                  placeholder="Contoh: Jl. Raya Maleber No. 12 (Samping Pos Ronda)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1"
                />
              </div>

              {/* Drop Pin Store Location Picker */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>📍 Titik Lokasi Toko di Peta</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold">
                    Lat: {storeCoords.lat.toFixed(4)}, Lng: {storeCoords.lng.toFixed(4)}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowStoreMapPicker(true)}
                  className="w-full mt-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60 rounded-xl p-3 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0 animate-bounce" />
                    <span>Tandai Titik Lokasi Toko di Map</span>
                  </div>
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg">Pilih di Peta Penuh ➔</span>
                </button>
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

      {/* ADMIN ORDER & RIDE DETAIL INSPECTOR MODAL */}
      {selectedAdminDetail && (
        <div
          className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 modal-overlay"
          onClick={() => setSelectedAdminDetail(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-zinc-200 dark:border-zinc-800 modal-content relative max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold text-lg">
                  🛡️
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">
                    Inspeksi Admin - {selectedAdminDetail.type === 'order' ? 'Pesanan UMKM' : 'Layanan Ojek'}
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono">ID Sistem: #{selectedAdminDetail.data.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAdminDetail(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold flex items-center justify-center cursor-pointer hover:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            {/* LIVE TRACKING PETA */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  🗺️ Peta Inspeksi Rute Perjalanan Sistem
                </span>
                <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-0.5 rounded-full">
                  ● Super Admin Audit
                </span>
              </div>

              <div className="h-60 sm:h-72 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner">
                <MapComponent
                  pickupLocation={
                    selectedAdminDetail.type === 'order'
                      ? { lat: (selectedAdminDetail.data as Order).lat, lng: (selectedAdminDetail.data as Order).lng, address: (selectedAdminDetail.data as Order).storeName }
                      : { lat: (selectedAdminDetail.data as RideRequest).pickupLat, lng: (selectedAdminDetail.data as RideRequest).pickupLng, address: (selectedAdminDetail.data as RideRequest).pickupAddress }
                  }
                  destLocation={
                    selectedAdminDetail.type === 'order'
                      ? { lat: (selectedAdminDetail.data as Order).lat - 0.0055, lng: (selectedAdminDetail.data as Order).lng + 0.0042, address: (selectedAdminDetail.data as Order).deliveryAddress }
                      : { lat: (selectedAdminDetail.data as RideRequest).destLat, lng: (selectedAdminDetail.data as RideRequest).destLng, address: (selectedAdminDetail.data as RideRequest).destAddress }
                  }
                  drivers={drivers}
                  stores={stores}
                  isHistoricalView={selectedAdminDetail.data.status === 'completed' || selectedAdminDetail.data.status === 'cancelled'}
                />
              </div>
            </div>

            {/* DETAIL DATA HUKUM & TRANSAKSI */}
            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl space-y-3 text-xs border border-zinc-200/60 dark:border-zinc-700/60">
              <h4 className="font-extrabold text-xs text-zinc-900 dark:text-white uppercase tracking-wider">
                📍 Pihak Terlibat &amp; Alamat Rute
              </h4>

              {selectedAdminDetail.type === 'order' ? (
                <>
                  <div className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
                    <span>Pemesan (Warga):</span>
                    <span className="font-bold">{(selectedAdminDetail.data as Order).buyerName} ({(selectedAdminDetail.data as Order).buyerPhone})</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
                    <span>Toko UMKM:</span>
                    <span className="font-bold">{(selectedAdminDetail.data as Order).storeName}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
                    <span>Kurir Driver:</span>
                    <span className="font-bold">{(selectedAdminDetail.data as Order).driverName || 'Belum diambil driver'}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
                    <span>Penumpang Ojek:</span>
                    <span className="font-bold">{(selectedAdminDetail.data as RideRequest).passengerName}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
                    <span>Driver Ojek:</span>
                    <span className="font-bold">{(selectedAdminDetail.data as RideRequest).driverName || 'Belum diambil driver'}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
                    <span>Jarak Tempuh:</span>
                    <span className="font-bold">{(selectedAdminDetail.data as RideRequest).distanceKm} km</span>
                  </div>
                </>
              )}
            </div>

            {/* FINANCIAL AUDIT */}
            <div className="bg-emerald-50 dark:bg-emerald-950/50 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
              <h4 className="font-extrabold text-xs text-emerald-900 dark:text-emerald-200 uppercase tracking-wider mb-2">
                💰 Audit Pembagian Alokasi Dana Sistem
              </h4>

              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Nilai Transaksi Dasar:</span>
                <span className="font-bold tabular-nums">
                  Rp {(selectedAdminDetail.type === 'order'
                    ? (selectedAdminDetail.data as Order).totalAmount
                    : (selectedAdminDetail.data as RideRequest).fare
                  ).toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Biaya Layanan Platform Kas Desa:</span>
                <span className="font-bold tabular-nums">Rp 1.000</span>
              </div>

              <div className="flex justify-between text-base font-black text-emerald-900 dark:text-emerald-200 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                <span>Total Omzet Transaksi Masuk Sistem</span>
                <span className="tabular-nums">
                  Rp {(selectedAdminDetail.type === 'order'
                    ? (selectedAdminDetail.data as Order).totalAmount + 1000
                    : (selectedAdminDetail.data as RideRequest).fare + 1000
                  ).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPER ADMIN: TAMBAH USER BARU */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 modal-overlay overflow-y-auto" onClick={() => setShowAddUserModal(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl border border-zinc-200 dark:border-zinc-800 modal-content my-auto max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-300/40">
                  Formulir Wewenang Super Admin
                </span>
                <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white mt-1">Tambah User Sistem Baru</h3>
              </div>
              <button onClick={() => setShowAddUserModal(false)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Nama Lengkap User</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pak Budi Santoso"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Alamat Email</label>
                <input
                  type="email"
                  placeholder="budi@maleber.des.id"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No. WhatsApp / HP</label>
                <input
                  type="tel"
                  placeholder="081234567890"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Pilih Role User</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1"
                >
                  <option value="admin">Petugas Desa (Admin)</option>
                  <option value="seller">Penjual (UMKM)</option>
                  <option value="driver">Driver (Ojek)</option>
                  <option value="buyer">Pembeli (Warga)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-700 cursor-pointer shadow-md"
                >
                  Tambahkan User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUPER ADMIN: EDIT USER */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 modal-overlay overflow-y-auto" onClick={() => setEditingUser(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl border border-zinc-200 dark:border-zinc-800 modal-content my-auto max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-300/40">
                  Super Admin User Editor
                </span>
                <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white mt-1">Edit Data &amp; Role User</h3>
              </div>
              <button onClick={() => setEditingUser(null)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Nama Lengkap User</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Alamat Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No. WhatsApp / HP</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Ubah Role User</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white mt-1"
                >
                  <option value="admin">Petugas Desa (Admin)</option>
                  <option value="seller">Penjual (UMKM)</option>
                  <option value="driver">Driver (Ojek)</option>
                  <option value="buyer">Pembeli (Warga)</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-md"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL SUPER ADMIN: CUSTOM KONFIRMASI HAPUS USER */}
      {userToDelete && (
        <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 modal-overlay overflow-y-auto" onClick={() => setUserToDelete(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-rose-500/30 modal-content my-auto text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center mx-auto ring-4 ring-rose-500/20 shadow-lg">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-rose-300/40">
                Peringatan Hapus Permanen
              </span>
              <h3 className="text-lg font-black text-zinc-900 dark:text-white">
                Hapus Akun &quot;{userToDelete.name}&quot;?
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed px-2">
                Apakah Anda yakin ingin menghapus akun <strong className="text-zinc-900 dark:text-white">{userToDelete.name}</strong> {userToDelete.email ? `(${userToDelete.email})` : ''} secara permanen dari Supabase PostgreSQL database? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-3 rounded-xl text-xs font-extrabold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="flex-1 py-3 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/30 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
