'use client';

import React, { useEffect, useState } from 'react';
import { DriverInfo, RideRequest, Order, Review, UserRole } from '@/types';
import MapComponent from './MapComponent';
import { Bike, Navigation, DollarSign, CheckCircle2, MapPin, Phone, Shield, ArrowRight, Star, MessageSquare, AlertCircle, ShoppingBag, Store, User } from 'lucide-react';
import { calculateOrderFees, calculateRideFees, DRIVER_COMMISSION_RATE, formatRupiah } from '@/lib/feeCalculator';

interface DriverModeProps {
  driver: DriverInfo;
  rides: RideRequest[];
  orders: Order[];
  reviews?: Review[];
  onToggleOnline: (driverId: string) => void;
  onAcceptRide: (rideId: string, driverId: string, driverName: string) => void;
  onUpdateRideStatus: (rideId: string, newStatus: RideRequest['status']) => void;
  onAcceptOrderDelivery: (orderId: string, driverId: string, driverName: string) => void;
  onUpdateOrderStatus: (orderId: string, newStatus: Order['status']) => void;
  onOpenChat?: (
    targetUser: { id: string; name: string; role: UserRole; phone?: string; avatar?: string },
    options?: { orderId?: string; rideId?: string; contextTitle?: string }
  ) => void;
}

const DRIVER_REVIEWS = [
  { id: 'rev-d1', userName: 'Teh Rina Maleber', rating: 5, comment: 'Driver mengemudi sangat hati-hati & cepat sampai lokasi tujuan. Ramah sekali!', date: 'Hari ini' },
  { id: 'rev-d2', userName: 'Pak RT Maman', rating: 5, comment: 'Pengantaran paket makanan rapi, tidak tumpah sama sekali. Mantap!', date: 'Kemarin' }
];

export default function DriverMode({
  driver,
  rides,
  orders,
  reviews,
  onToggleOnline,
  onAcceptRide,
  onUpdateRideStatus,
  onAcceptOrderDelivery,
  onUpdateOrderStatus,
  onOpenChat
}: DriverModeProps) {
  const [selectedJobDetail, setSelectedJobDetail] = useState<{
    type: 'order' | 'ride';
    data: Order | RideRequest;
  } | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<'all' | 'rides' | 'orders' | null>(null);
  const [gpsActive, setGpsActive] = React.useState(false);
  const [gpsError, setGpsError] = React.useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = React.useState<{ lat: number; lng: number } | null>(null);

  // HTML5 Real-Time Browser Geolocation Tracking
  React.useEffect(() => {
    if (!driver.isOnline || typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGpsActive(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });
        setGpsActive(true);
        setGpsError(null);

        fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_driver_location',
            data: {
              driverId: driver.id,
              lat: latitude,
              lng: longitude,
              isOnline: true
            }
          })
        }).catch((err) => console.warn('Failed to push live GPS:', err));
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setGpsError('Izin akses GPS belum diberikan di browser Anda.');
        setGpsActive(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 3000
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [driver.isOnline, driver.id]);

  // Continuous Background GPS Tracking & Screen WakeLock
  useEffect(() => {
    let watchId: number | null = null;
    let wakeLockObj: any = null;

    if (driver.isOnline && typeof window !== 'undefined' && 'geolocation' in navigator) {
      // 1. Enable Screen WakeLock so mobile display doesn't sleep while driving
      if ('wakeLock' in navigator) {
        (navigator as any).wakeLock.request('screen').then((wl: any) => {
          wakeLockObj = wl;
        }).catch(() => {});
      }

      // 2. High Accuracy Background GPS Watch Position
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setCurrentCoords({ lat: latitude, lng: longitude });
          setGpsActive(true);
          setGpsError(null);

          // Update position directly into Supabase PostgreSQL DB
          fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_driver_location',
              data: {
                driverId: driver.id,
                lat: latitude,
                lng: longitude,
                isOnline: true
              }
            })
          }).catch(() => {});
        },
        (err) => {
          setGpsError(err.message);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    }

    return () => {
      if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (wakeLockObj) {
        wakeLockObj.release().catch(() => {});
      }
    };
  }, [driver.isOnline, driver.id]);

  const requestGpsPermission = () => {
    if (!('geolocation' in navigator)) {
      alert('Browser perangkat Anda tidak mendukung GPS HTML5.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });
        setGpsActive(true);
        setGpsError(null);

        fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_driver_location',
            data: {
              driverId: driver.id,
              lat: latitude,
              lng: longitude,
              isOnline: true
            }
          })
        });
      },
      (err) => {
        alert('Gagal mengambil lokasi GPS: ' + err.message + '. Silakan izinkan akses lokasi di browser Anda.');
        setGpsError(err.message);
      },
      { enableHighAccuracy: true }
    );
  };

  // Active jobs for this driver
  const activeRide = rides.find(
    (r) => r.driverId === driver.id && r.status !== 'completed' && r.status !== 'cancelled'
  );

  const activeFoodDelivery = orders.find(
    (o) => o.driverId === driver.id && o.status !== 'completed' && o.status !== 'cancelled'
  );

  const hasActiveJob = Boolean(activeRide || activeFoodDelivery);

  // Available open jobs in radar
  const availableRides = rides.filter((r) => r.status === 'requested' && !r.driverId);
  const availableOrderDeliveries = orders.filter(
    (o) => (o.status === 'ready_for_pickup' || o.status === 'cooking') && !o.driverId
  );

  // History for this driver
  const myHistoryRides = rides
    .filter((r) => r.driverId === driver.id)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const myHistoryOrders = orders
    .filter((o) => o.driverId === driver.id)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  // Calculate total driver earnings today
  const completedRides = rides.filter((r) => r.driverId === driver.id && r.status === 'completed');
  const completedOrders = orders.filter((o) => o.driverId === driver.id && o.status === 'completed');

  // Gross earnings (sebelum potongan)
  const totalGrossEarnings =
    completedRides.reduce((acc, curr) => acc + curr.fare, 0) +
    completedOrders.reduce((acc, curr) => acc + curr.deliveryFee, 0);

  // Net earnings (setelah potongan komisi platform 20%)
  const totalDriverCommission =
    completedRides.reduce((acc, curr) => acc + calculateRideFees(curr.fare).driverCommission, 0) +
    completedOrders.reduce((acc, curr) => acc + calculateOrderFees(0, curr.deliveryFee).driverCommission, 0);

  const totalEarnings = totalGrossEarnings - totalDriverCommission;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Driver Status Banner */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-black text-xl">
            <Bike className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-zinc-900 dark:text-white">
                {driver.name}
              </h2>
              <span className="bg-blue-100 text-blue-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                {driver.vehicleModel} &bull; {driver.vehicleNumber}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-xs text-zinc-500 font-medium">Rating {driver.rating} ({driver.reviewCount} ulasan)</p>
              {gpsActive ? (
                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  GPS Live Aktif: {currentCoords?.lat.toFixed(4)}, {currentCoords?.lng.toFixed(4)}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={requestGpsPermission}
                  className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full hover:bg-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <MapPin className="w-3 h-3 text-amber-600" />
                  Aktifkan Live GPS Perangkat
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Online / Offline Switch Button */}
        <button
          onClick={() => {
            onToggleOnline(driver.id);
            if (!driver.isOnline) requestGpsPermission();
          }}
          className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-black text-xs transition-all cursor-pointer shadow-md ${
            driver.isOnline
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
              : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <span className={`w-3 h-3 rounded-full ${driver.isOnline ? 'bg-white animate-ping' : 'bg-zinc-400'}`}></span>
          {driver.isOnline ? 'STATUS: ONLINE (SIAP TERIMA ORDER)' : 'STATUS: OFFLINE'}
        </button>
      </div>

      {/* Driver Earnings Summary Cards (Clickable for History) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setShowHistoryModal('all')}
          className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-4 text-left hover:border-emerald-500/60 hover:shadow-emerald-500/10 hover:shadow-lg transition-all cursor-pointer group active:scale-98"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] text-zinc-500 font-medium flex items-center gap-1">
                Pendapatan Bersih Driver
              </span>
              <h4 className="text-xl font-black text-zinc-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                {formatRupiah(totalEarnings)}
              </h4>
              <p className="text-[10px] text-rose-500 font-bold">Potongan platform: -{formatRupiah(totalDriverCommission)} ({(DRIVER_COMMISSION_RATE * 100).toFixed(0)}%)</p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setShowHistoryModal('rides')}
          className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-4 text-left hover:border-blue-500/60 hover:shadow-blue-500/10 hover:shadow-lg transition-all cursor-pointer group active:scale-98"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] text-zinc-500 font-medium">Ojek Selesai</span>
              <h4 className="text-xl font-black text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors">
                {completedRides.length} Perjalanan
              </h4>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setShowHistoryModal('orders')}
          className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-4 text-left hover:border-amber-500/60 hover:shadow-amber-500/10 hover:shadow-lg transition-all cursor-pointer group active:scale-98"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] text-zinc-500 font-medium">Kurir Selesai</span>
              <h4 className="text-xl font-black text-zinc-900 dark:text-white group-hover:text-amber-600 transition-colors">
                {completedOrders.length} Pengantaran
              </h4>
            </div>
          </div>
        </button>
      </div>

      {/* ACTIVE JOB BANNER & STEPPER */}
      {hasActiveJob && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-emerald-950 text-white rounded-3xl p-6 shadow-xl space-y-4 border border-blue-500/30">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
              </span>
              <h3 className="font-extrabold text-base">ORDERAN SEDANG BERJALAN (AKTIF)</h3>
            </div>
            <span className="bg-emerald-500 text-emerald-950 font-black text-xs px-3 py-1 rounded-full uppercase">
              {activeRide ? activeRide.status : activeFoodDelivery?.status}
            </span>
          </div>

          {/* Active Ride Details */}
          {activeRide && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-white/10 p-3.5 rounded-2xl space-y-1">
                  <span className="text-blue-200">Penumpang:</span>
                  <p className="font-black text-base">{activeRide.passengerName} ({activeRide.passengerPhone})</p>
                </div>
                <div className="bg-white/10 p-3.5 rounded-2xl space-y-1">
                  <span className="text-blue-200">Rute Perjalanan:</span>
                  <p className="font-bold">{activeRide.pickupAddress} &rarr; {activeRide.destAddress}</p>
                </div>
              </div>

              {/* Live Tracking Map for Active Ride (Gojek / Buyer Style) */}
              <div className="h-64 sm:h-72 rounded-2xl overflow-hidden border border-white/20 shadow-inner">
                <MapComponent
                  pickupLocation={
                    activeRide.status === 'accepted' || activeRide.status === 'arrived_pickup'
                      ? { lat: currentCoords?.lat ?? driver.lat, lng: currentCoords?.lng ?? driver.lng, address: 'Lokasi Anda (Driver)' }
                      : { lat: activeRide.pickupLat, lng: activeRide.pickupLng, address: activeRide.pickupAddress }
                  }
                  destLocation={
                    activeRide.status === 'accepted' || activeRide.status === 'arrived_pickup'
                      ? { lat: activeRide.pickupLat, lng: activeRide.pickupLng, address: activeRide.pickupAddress }
                      : { lat: activeRide.destLat, lng: activeRide.destLng, address: activeRide.destAddress }
                  }
                  drivers={[{ ...driver, lat: currentCoords?.lat ?? driver.lat, lng: currentCoords?.lng ?? driver.lng }]}
                  center={{ lat: currentCoords?.lat ?? driver.lat, lng: currentCoords?.lng ?? driver.lng }}
                  zoom={17}
                  activeRouteStatus={activeRide.status}
                  forceStreetMode={true}
                />
              </div>

              {/* Status Stepper Actions & Chat */}
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 pt-2">
                {onOpenChat && (
                  <button
                    onClick={() => onOpenChat({ id: activeRide.passengerId || 'usr-buyer-1', name: activeRide.passengerName, role: 'buyer', phone: activeRide.passengerPhone }, { rideId: activeRide.id, contextTitle: `Penumpang (${activeRide.passengerName})` })}
                    className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white font-bold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat Penumpang
                  </button>
                )}

                {activeRide.status === 'accepted' && (
                  <button
                    onClick={() => onUpdateRideStatus(activeRide.id, 'arrived_pickup')}
                    className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-extrabold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer text-center"
                  >
                    1. Tiba di Lokasi Jemput (Notify Penumpang)
                  </button>
                )}
                {activeRide.status === 'arrived_pickup' && (
                  <button
                    onClick={() => onUpdateRideStatus(activeRide.id, 'on_the_way')}
                    className="w-full sm:w-auto bg-blue-400 hover:bg-blue-300 text-blue-950 font-extrabold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer text-center"
                  >
                    2. Mulai Perjalanan Antar Penumpang
                  </button>
                )}
                {activeRide.status === 'on_the_way' && (
                  <button
                    onClick={() => onUpdateRideStatus(activeRide.id, 'completed')}
                    className="w-full sm:w-auto bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black text-xs px-6 py-3.5 rounded-xl transition-all cursor-pointer shadow-lg text-center"
                  >
                    3. Selesai &amp; Terima Pembayaran (Rp {activeRide.fare.toLocaleString('id-ID')})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Active Food Delivery Details */}
          {activeFoodDelivery && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-white/10 p-3.5 rounded-2xl space-y-1">
                  <span className="text-blue-200">Ambil di Toko:</span>
                  <p className="font-black text-base">{activeFoodDelivery.storeName}</p>
                </div>
                <div className="bg-white/10 p-3.5 rounded-2xl space-y-1">
                  <span className="text-blue-200">Antar ke Pemesan:</span>
                  <p className="font-bold">{activeFoodDelivery.buyerName} ({activeFoodDelivery.deliveryAddress})</p>
                </div>
              </div>

              {/* Live Tracking Map for Active Food Delivery */}
              <div className="h-64 sm:h-72 rounded-2xl overflow-hidden border border-white/20 shadow-inner">
                {(() => {
                  const storePos = { lat: activeFoodDelivery.lat || -6.8155, lng: activeFoodDelivery.lng || 107.1865 };
                  const isHeadingToStore = activeFoodDelivery.status === 'pending' || activeFoodDelivery.status === 'cooking' || activeFoodDelivery.status === 'ready_for_pickup';
                  const activeDrv = { ...driver, lat: currentCoords?.lat ?? driver.lat, lng: currentCoords?.lng ?? driver.lng };
                  return (
                    <MapComponent
                      pickupLocation={
                        isHeadingToStore
                          ? { lat: activeDrv.lat, lng: activeDrv.lng, address: 'Lokasi Anda (Driver)' }
                          : { lat: storePos.lat, lng: storePos.lng, address: activeFoodDelivery.storeName }
                      }
                      destLocation={
                        isHeadingToStore
                          ? { lat: storePos.lat, lng: storePos.lng, address: activeFoodDelivery.storeName }
                          : { lat: storePos.lat - 0.0055, lng: storePos.lng + 0.0042, address: activeFoodDelivery.deliveryAddress }
                      }
                      drivers={[activeDrv]}
                      center={{ lat: activeDrv.lat, lng: activeDrv.lng }}
                      zoom={17}
                      activeRouteStatus={activeFoodDelivery.status}
                      forceStreetMode={true}
                    />
                  );
                })()}
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 pt-2">
                {onOpenChat && (
                  <>
                    <button
                      onClick={() => onOpenChat({ id: activeFoodDelivery.storeId, name: activeFoodDelivery.storeName, role: 'seller' }, { orderId: activeFoodDelivery.id, contextTitle: `Pemilik Toko (${activeFoodDelivery.storeName})` })}
                      className="w-full sm:w-auto bg-amber-500/30 hover:bg-amber-500/50 text-white font-bold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Chat Penjual Toko
                    </button>

                    <button
                      onClick={() => onOpenChat({ id: activeFoodDelivery.buyerId || 'usr-buyer-1', name: activeFoodDelivery.buyerName, role: 'buyer', phone: activeFoodDelivery.buyerPhone }, { orderId: activeFoodDelivery.id, contextTitle: `Pemesan Makanan (${activeFoodDelivery.buyerName})` })}
                      className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white font-bold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Chat Pemesan
                    </button>
                  </>
                )}

                {activeFoodDelivery.status === 'delivering' && (
                  <button
                    onClick={() => onUpdateOrderStatus(activeFoodDelivery.id, 'completed')}
                    className="w-full sm:w-auto bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black text-xs px-6 py-3.5 rounded-xl transition-all cursor-pointer text-center shadow-lg"
                  >
                    Pesanan Makanan Sampai &amp; Selesai
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RADAR JOB MASUK (Available Job Requests) */}
      <div className="space-y-4">
        <h3 className="font-extrabold text-lg text-zinc-900 dark:text-white flex items-center gap-2">
          <Navigation className="w-5 h-5 text-blue-600 shrink-0" />
          Radar Tawaran Orderan Desa Maleber
        </h3>

        {/* SINGLE JOB ACTIVE WARNING */}
        {hasActiveJob && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-200 text-xs font-bold shadow-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
            <span>Sistem Single-Order: Anda sedang menjalankan 1 order aktif. Selesaikan pesanan berjalan sebelum mengambil tawaran lain!</span>
          </div>
        )}

        {!driver.isOnline ? (
          <div className="p-8 bg-zinc-100 dark:bg-zinc-800/80 rounded-3xl text-center space-y-2 border border-zinc-200 dark:border-zinc-700">
            <Shield className="w-10 h-10 text-zinc-400 mx-auto" />
            <p className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">Status Anda Sedang Offline</p>
            <p className="text-xs text-zinc-500">Aktifkan tombol ONLINE di atas untuk melihat dan menerima tawaran ojek/kurir.</p>
          </div>
        ) : availableRides.length === 0 && availableOrderDeliveries.length === 0 ? (
          <div className="p-8 bg-white dark:bg-zinc-900 rounded-3xl text-center space-y-2 border border-zinc-200 dark:border-zinc-800">
            <Bike className="w-10 h-10 text-zinc-300 mx-auto" />
            <p className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">Belum Ada Orderan Baru</p>
            <p className="text-xs text-zinc-400">Sistem akan memperbarui orderan otomatis ketika ada warga yang memesan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ride Requests */}
            {availableRides.map((ride) => (
              <div key={ride.id} className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border-2 border-blue-500/40 shadow-md space-y-3">
                <div className="flex justify-between items-start">
                  <span className="bg-blue-100 text-blue-800 text-xs font-black px-2.5 py-0.5 rounded-full">
                    OJEK PENUMPANG
                  </span>
                  <span className="font-black text-emerald-600 text-lg">
                    Rp {ride.fare.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="text-xs space-y-1.5 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-zinc-500">Jemput:</span>
                    <span className="font-bold text-zinc-900 dark:text-white">{ride.pickupAddress}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="text-zinc-500">Tujuan:</span>
                    <span className="font-bold text-zinc-900 dark:text-white">{ride.destAddress}</span>
                  </div>
                </div>

                {hasActiveJob ? (
                  <button
                    disabled
                    className="w-full bg-zinc-200 dark:bg-zinc-800 text-zinc-400 font-bold text-xs py-3 rounded-2xl cursor-not-allowed opacity-60"
                  >
                    Selesaikan Order Aktif Anda Dahulu
                  </button>
                ) : (
                  <button
                    onClick={() => onAcceptRide(ride.id, driver.id, driver.name)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-3 rounded-2xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    Terima Order Ojek Ini
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {/* Food Delivery Requests */}
            {availableOrderDeliveries.map((ord) => (
              <div key={ord.id} className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border-2 border-amber-500/40 shadow-md space-y-3">
                <div className="flex justify-between items-start">
                  <span className="bg-amber-100 text-amber-800 text-xs font-black px-2.5 py-0.5 rounded-full">
                    KURIR UMKM KULINER
                  </span>
                  <span className="font-black text-emerald-600 text-lg">
                    Ongkir: Rp {ord.deliveryFee.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="text-xs space-y-1 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-2xl">
                  <p className="font-bold text-zinc-900 dark:text-white">Toko: {ord.storeName}</p>
                  <p className="text-zinc-500">Pemesan: {ord.buyerName} ({ord.deliveryAddress})</p>
                </div>

                {hasActiveJob ? (
                  <button
                    disabled
                    className="w-full bg-zinc-200 dark:bg-zinc-800 text-zinc-400 font-bold text-xs py-3 rounded-2xl cursor-not-allowed opacity-60"
                  >
                    Selesaikan Order Aktif Anda Dahulu
                  </button>
                ) : (
                  <button
                    onClick={() => onAcceptOrderDelivery(ord.id, driver.id, driver.name)}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black text-xs py-3 rounded-2xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    Terima Job Kurir Ini
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

          </div>
        )}
      </div>

      {/* DRIVER ORDER & RIDE HISTORY SECTION */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">Riwayat Perjalanan &amp; Pengantaran Driver ({myHistoryRides.length + myHistoryOrders.length})</h3>
          </div>
          <span className="text-xs font-bold text-zinc-500">Urutan: Terbaru ke Terlama</span>
        </div>

        {myHistoryRides.length === 0 && myHistoryOrders.length === 0 ? (
          <div className="text-center py-6 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700/60">
            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Belum Ada Riwayat Perjalanan Selesai</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Orderan ojek &amp; makanan yang Anda terima akan tercatat di sini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* History Rides */}
            {myHistoryRides.map((rd) => {
              const isFinished = rd.status === 'completed' || rd.status === 'cancelled';
              return (
                <div
                  key={rd.id}
                  onClick={() => setSelectedJobDetail({ type: 'ride', data: rd })}
                  className={`p-4 sm:p-5 rounded-3xl border shadow-sm space-y-3 transition-all cursor-pointer group ${
                    isFinished
                      ? 'opacity-60 grayscale-[15%] bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200/50 dark:border-zinc-800/60 hover:opacity-100 hover:grayscale-0'
                      : 'bg-white dark:bg-zinc-900 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/20'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">
                      OJEK PENUMPANG
                    </span>
                    <span className="font-black text-emerald-600 tabular-nums text-sm">Rp {rd.fare.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="space-y-1 text-zinc-600 dark:text-zinc-300 text-xs">
                    <p className="font-bold text-zinc-900 dark:text-white group-hover:text-emerald-600 transition-colors">Penumpang: {rd.passengerName}</p>
                    <p className="truncate">Awal: {rd.pickupAddress}</p>
                    <p className="truncate">Tujuan: {rd.destAddress}</p>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 text-[10px]">
                    <span className={`font-extrabold px-2.5 py-0.5 rounded-full ${
                      rd.status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {rd.status === 'completed' ? 'Selesai' : 'Dibatalkan'}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* History Orders */}
            {myHistoryOrders.map((ord) => {
              const isFinished = ord.status === 'completed' || ord.status === 'cancelled';
              return (
                <div
                  key={ord.id}
                  onClick={() => setSelectedJobDetail({ type: 'order', data: ord })}
                  className={`p-4 sm:p-5 rounded-3xl border shadow-sm space-y-3 transition-all cursor-pointer group ${
                    isFinished
                      ? 'opacity-60 grayscale-[15%] bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200/50 dark:border-zinc-800/60 hover:opacity-100 hover:grayscale-0'
                      : 'bg-white dark:bg-zinc-900 border-amber-500/80 shadow-md ring-1 ring-amber-500/20'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">
                      KURIR UMKM KULINER
                    </span>
                    <span className="font-black text-emerald-600 tabular-nums text-sm">Ongkir: Rp {ord.deliveryFee.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="space-y-1 text-zinc-600 dark:text-zinc-300 text-xs">
                    <p className="font-bold text-zinc-900 dark:text-white group-hover:text-emerald-600 transition-colors">Toko: {ord.storeName}</p>
                    <p className="truncate">Penerima: {ord.buyerName} ({ord.deliveryAddress})</p>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 text-[10px]">
                    <span className={`font-extrabold px-2.5 py-0.5 rounded-full ${
                      ord.status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {ord.status === 'completed' ? 'Selesai' : 'Dibatalkan'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DRIVER REVIEWS & COMMENTS FEED — DYNAMIC REAL-TIME DATA FOR THIS DRIVER */}
      {(() => {
        const myDriverReviews = (reviews || []).filter(
          (r) => r.targetId === driver.id && r.targetType === 'driver'
        );

        return (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">Ulasan &amp; Komentar Penumpang ({myDriverReviews.length})</h3>
              </div>
              <span className="text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-950 px-3 py-1 rounded-full">
                ★ {driver.rating || 5.0}
              </span>
            </div>

            {myDriverReviews.length === 0 ? (
              <div className="text-center py-6 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700/60">
                <Star className="w-8 h-8 text-amber-400/50 mx-auto mb-1" />
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Belum ada ulasan untuk Anda</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Ulasan dari penumpang &amp; pembeli makanan akan muncul di sini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myDriverReviews.map((rev) => (
                  <div key={rev.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-xs text-zinc-900 dark:text-white">{rev.userName}</span>
                      <span className="text-amber-500 font-bold text-xs flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-current" /> {rev.rating}.0
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 italic">&ldquo;{rev.comment}&rdquo;</p>
                    <span className="text-[10px] text-zinc-400 block text-right">
                      {new Date(rev.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* DRIVER JOB DETAIL MODAL */}
      {selectedJobDetail && (
        <div
          className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 modal-overlay"
          onClick={() => setSelectedJobDetail(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-zinc-200 dark:border-zinc-800 modal-content relative max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold text-lg">
                  {selectedJobDetail.type === 'order' ? <ShoppingBag className="w-5 h-5" /> : <Bike className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">
                    Detail Pekerjaan {selectedJobDetail.type === 'order' ? 'Kurir Makanan' : 'Ojek Maleber'}
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono">ID Pekerjaan: #{selectedJobDetail.data.id.slice(-8)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJobDetail(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold flex items-center justify-center cursor-pointer hover:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            {/* LIVE TRACKING MAP WITH ETA & DYNAMIC MULTI-STAGE ROUTING */}
            <div className="space-y-2">
              {(() => {
                const item = selectedJobDetail.data;
                const isRide = selectedJobDetail.type === 'ride';
                const isOrder = selectedJobDetail.type === 'order';

                let pickupLoc = { lat: -6.8155, lng: 107.1865, address: 'Maleber' };
                let destLoc = { lat: -6.8155, lng: 107.1865, address: 'Maleber' };
                let trackingTitle = 'Peta Navigasi Live Driver Maleber';
                let isFinished = item.status === 'completed' || item.status === 'cancelled';

                const driverPos = { lat: driver.lat, lng: driver.lng };

                if (isRide) {
                  const ride = item as RideRequest;
                  const pickupPos = { lat: ride.pickupLat, lng: ride.pickupLng, address: ride.pickupAddress };
                  const destPos = { lat: ride.destLat, lng: ride.destLng, address: ride.destAddress };

                  if (ride.status === 'accepted' || ride.status === 'arrived_pickup' || ride.status === 'requested') {
                    pickupLoc = { lat: driverPos.lat, lng: driverPos.lng, address: 'Lokasi Anda (Driver)' };
                    destLoc = pickupPos;
                    trackingTitle = `Tahap 1: Rute Jemput Penumpang (${ride.passengerName})`;
                  } else if (ride.status === 'on_the_way') {
                    pickupLoc = pickupPos;
                    destLoc = destPos;
                    trackingTitle = `Tahap 2: Rute Antar Penumpang (${ride.passengerName}) ke Alamat Tujuan`;
                  } else {
                    pickupLoc = pickupPos;
                    destLoc = destPos;
                    trackingTitle = `Riwayat Rute Perjalanan Ojek`;
                  }
                } else if (isOrder) {
                  const order = item as Order;
                  const storePos = { lat: order.lat || -6.8155, lng: order.lng || 107.1865 };
                  const storeLoc = { lat: storePos.lat, lng: storePos.lng, address: order.storeName };
                  const customerLoc = { lat: order.lat ? order.lat - 0.0055 : -6.8210, lng: order.lng ? order.lng + 0.0042 : 107.1907, address: order.deliveryAddress };

                  if (order.status === 'pending' || order.status === 'cooking' || order.status === 'ready_for_pickup') {
                    pickupLoc = { lat: driverPos.lat, lng: driverPos.lng, address: 'Lokasi Anda (Driver)' };
                    destLoc = storeLoc;
                    trackingTitle = `Tahap 1: Rute Ambil Pesanan di Toko (${order.storeName})`;
                  } else if (order.status === 'delivering') {
                    pickupLoc = storeLoc;
                    destLoc = customerLoc;
                    trackingTitle = `Tahap 2: Rute Antar Makanan ke Pemesan (${order.buyerName})`;
                  } else {
                    pickupLoc = storeLoc;
                    destLoc = customerLoc;
                    trackingTitle = `Riwayat Rute Pengiriman Makanan`;
                  }
                }

                return (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center flex-wrap gap-1">
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        {trackingTitle}
                      </span>
                      <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2.5 py-0.5 rounded-full">
                        ● Real-time Navigation
                      </span>
                    </div>

                    <div className="h-60 sm:h-72 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner">
                      <MapComponent
                        pickupLocation={pickupLoc}
                        destLocation={destLoc}
                        drivers={[driver]}
                        activeRouteStatus={item.status}
                        isHistoricalView={isFinished}
                        forceStreetMode={true}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* RINCIAN PERJALANAN / RUTE */}
            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl space-y-3 text-xs border border-zinc-200/60 dark:border-zinc-700/60">
              <h4 className="font-extrabold text-xs text-zinc-900 dark:text-white uppercase tracking-wider">
                Rincian Penjemputan &amp; Pengantaran
              </h4>

              {selectedJobDetail.type === 'order' ? (
                <>
                  <div className="flex items-start gap-2.5">
                    <Store className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-extrabold text-zinc-500">Toko / Warung UMKM</span>
                      <p className="font-bold text-zinc-900 dark:text-white">{(selectedJobDetail.data as Order).storeName}</p>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-zinc-200 dark:border-zinc-700 pt-2 flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-extrabold text-emerald-600">Nama Pembeli &amp; Alamat Pengiriman</span>
                      <p className="font-bold text-zinc-900 dark:text-white">
                        {(selectedJobDetail.data as Order).buyerName} &bull; {(selectedJobDetail.data as Order).deliveryAddress}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2.5">
                    <User className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-extrabold text-emerald-600 uppercase">Nama Penumpang</span>
                      <p className="font-bold text-zinc-900 dark:text-white">{(selectedJobDetail.data as RideRequest).passengerName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 border-t border-dashed border-zinc-200 dark:border-zinc-700 pt-2">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-extrabold text-emerald-600 uppercase">Titik Penjemputan</span>
                      <p className="font-bold text-zinc-900 dark:text-white">{(selectedJobDetail.data as RideRequest).pickupAddress}</p>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-zinc-200 dark:border-zinc-700 pt-2 flex items-start gap-2.5">
                    <Navigation className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-extrabold text-rose-600 uppercase">Titik Tujuan</span>
                      <p className="font-bold text-zinc-900 dark:text-white">{(selectedJobDetail.data as RideRequest).destAddress}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* RINCIAN PENDAPATAN DRIVER */}
            <div className="bg-emerald-50 dark:bg-emerald-950/50 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
              <h4 className="font-extrabold text-xs text-emerald-900 dark:text-emerald-200 uppercase tracking-wider mb-2">
                💵 Rincian Pendapatan Bersih Driver
              </h4>

              {(() => {
                const grossAmount = selectedJobDetail.type === 'order'
                  ? (selectedJobDetail.data as Order).deliveryFee || 5000
                  : (selectedJobDetail.data as RideRequest).fare;

                const driverFees = selectedJobDetail.type === 'order'
                  ? calculateOrderFees(0, grossAmount)
                  : calculateRideFees(grossAmount);

                const commission = driverFees.driverCommission;
                const netIncome = driverFees.driverNetIncome;

                return (
                  <>
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>{selectedJobDetail.type === 'order' ? 'Ongkos Kirim Makanan' : 'Tarif Ojek Tempuh'}</span>
                      <span className="font-bold tabular-nums">{formatRupiah(grossAmount)}</span>
                    </div>

                    <div className="flex justify-between text-rose-500 dark:text-rose-400">
                      <span>Potongan Komisi Platform ({(DRIVER_COMMISSION_RATE * 100).toFixed(0)}%)</span>
                      <span className="font-bold tabular-nums">-{formatRupiah(commission)}</span>
                    </div>

                    <div className="flex justify-between text-base font-black text-emerald-900 dark:text-emerald-200 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                      <span>Pendapatan Bersih Driver</span>
                      <span className="tabular-nums">{formatRupiah(netIncome)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* DRIVER HISTORY BREAKDOWN MODAL (TRIGGERED FROM STAT CARDS) */}
      {showHistoryModal && (
        <div
          className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 modal-overlay"
          onClick={() => setShowHistoryModal(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-3xl max-w-3xl w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-zinc-200 dark:border-zinc-800 modal-content relative max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold text-lg">
                  📜
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">
                    {showHistoryModal === 'all' && 'History Pendapatan & Pekerjaan Driver'}
                    {showHistoryModal === 'rides' && 'History Ojek Penumpang Selesai'}
                    {showHistoryModal === 'orders' && 'History Kurir Pengantaran Selesai'}
                  </h3>
                  <p className="text-xs text-zinc-500">Klik item orderan untuk melihat rincian rute peta &amp; biaya lengkap</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold flex items-center justify-center cursor-pointer hover:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <button
                type="button"
                onClick={() => setShowHistoryModal('all')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                  showHistoryModal === 'all'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Semua ({myHistoryRides.length + myHistoryOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setShowHistoryModal('rides')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                  showHistoryModal === 'rides'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Ojek ({myHistoryRides.length})
              </button>
              <button
                type="button"
                onClick={() => setShowHistoryModal('orders')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                  showHistoryModal === 'orders'
                    ? 'bg-amber-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Kurir Kuliner ({myHistoryOrders.length})
              </button>
            </div>

            {/* Total Balance Header in Modal */}
            <div className="bg-emerald-50 dark:bg-emerald-950/60 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-emerald-800 dark:text-emerald-300 font-extrabold block">Pendapatan Bersih Driver</span>
                  <p className="text-zinc-500 text-[10px]">Setelah potongan komisi platform {(DRIVER_COMMISSION_RATE * 100).toFixed(0)}%</p>
                </div>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatRupiah(totalEarnings)}
                </span>
              </div>
              <div className="flex justify-between text-rose-500 dark:text-rose-400 text-[10px] pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                <span>Total potongan komisi platform</span>
                <span className="font-bold tabular-nums">-{formatRupiah(totalDriverCommission)}</span>
              </div>
            </div>

            {/* History Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {(showHistoryModal === 'all' || showHistoryModal === 'rides') &&
                myHistoryRides.map((rd) => (
                  <div
                    key={rd.id}
                    onClick={() => {
                      setShowHistoryModal(null);
                      setSelectedJobDetail({ type: 'ride', data: rd });
                    }}
                    className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 space-y-2 text-xs hover:border-emerald-500/50 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">
                        OJEK PENUMPANG
                      </span>
                      <span className="font-black text-emerald-600 tabular-nums text-sm">Rp {rd.fare.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="space-y-1 text-zinc-600 dark:text-zinc-300">
                      <p className="font-bold text-zinc-900 dark:text-white group-hover:text-emerald-600 transition-colors">Penumpang: {rd.passengerName}</p>
                      <p className="truncate text-[11px]">Tujuan: {rd.destAddress}</p>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 text-[10px]">
                      <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                        Selesai
                      </span>
                    </div>
                  </div>
                ))}

              {(showHistoryModal === 'all' || showHistoryModal === 'orders') &&
                myHistoryOrders.map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => {
                      setShowHistoryModal(null);
                      setSelectedJobDetail({ type: 'order', data: ord });
                    }}
                    className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 space-y-2 text-xs hover:border-amber-500/50 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">
                        KURIR KULINER
                      </span>
                      <span className="font-black text-emerald-600 tabular-nums text-sm">Ongkir: Rp {(ord.deliveryFee || 5000).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="space-y-1 text-zinc-600 dark:text-zinc-300">
                      <p className="font-bold text-zinc-900 dark:text-white group-hover:text-amber-600 transition-colors">Toko: {ord.storeName}</p>
                      <p className="truncate text-[11px]">Penerima: {ord.buyerName}</p>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 text-[10px]">
                      <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                        Selesai
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
