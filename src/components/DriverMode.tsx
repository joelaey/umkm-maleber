'use client';

import React from 'react';
import { DriverInfo, RideRequest, Order, Review, UserRole } from '@/types';
import MapComponent from './MapComponent';
import { Bike, Navigation, DollarSign, CheckCircle2, MapPin, Phone, Shield, ArrowRight, Star, MessageSquare, AlertCircle } from 'lucide-react';

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

  // Calculate total driver earnings today
  const completedRides = rides.filter((r) => r.driverId === driver.id && r.status === 'completed');
  const completedOrders = orders.filter((o) => o.driverId === driver.id && o.status === 'completed');
  const totalEarnings =
    completedRides.reduce((acc, curr) => acc + curr.fare, 0) +
    completedOrders.reduce((acc, curr) => acc + curr.deliveryFee, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Driver Status Banner */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-black text-xl">
            🛵
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
              <p className="text-xs text-zinc-500">⭐ {driver.rating} ({driver.reviewCount} ulasan)</p>
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
          className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-black text-xs transition-all cursor-pointer shadow-md ${
            driver.isOnline
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
              : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <span className={`w-3 h-3 rounded-full ${driver.isOnline ? 'bg-white animate-ping' : 'bg-zinc-400'}`}></span>
          {driver.isOnline ? 'STATUS: ONLINE (SIAP TERIMA ORDER)' : 'STATUS: OFFLINE'}
        </button>
      </div>

      {/* Driver Earnings Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 font-medium">Pendapatan Driver Hari Ini</span>
            <h4 className="text-xl font-black text-zinc-900 dark:text-white">
              Rp {totalEarnings.toLocaleString('id-ID')}
            </h4>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 font-medium">Ojek Selesai</span>
            <h4 className="text-xl font-black text-zinc-900 dark:text-white">
              {completedRides.length} Perjalanan
            </h4>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 font-medium">Kurir Selesai</span>
            <h4 className="text-xl font-black text-zinc-900 dark:text-white">
              {completedOrders.length} Pengantaran
            </h4>
          </div>
        </div>
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
                  <p className="font-bold">📍 {activeRide.pickupAddress} &rarr; 🏁 {activeRide.destAddress}</p>
                </div>
              </div>

              {/* Status Stepper Actions & Chat */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {onOpenChat && (
                  <button
                    onClick={() => onOpenChat({ id: activeRide.passengerId || 'usr-buyer-1', name: activeRide.passengerName, role: 'buyer', phone: activeRide.passengerPhone }, { rideId: activeRide.id, contextTitle: `Penumpang (${activeRide.passengerName})` })}
                    className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat Penumpang
                  </button>
                )}

                {activeRide.status === 'accepted' && (
                  <button
                    onClick={() => onUpdateRideStatus(activeRide.id, 'arrived_pickup')}
                    className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-extrabold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer"
                  >
                    1. Tiba di Lokasi Jemput (Notify Penumpang)
                  </button>
                )}
                {activeRide.status === 'arrived_pickup' && (
                  <button
                    onClick={() => onUpdateRideStatus(activeRide.id, 'on_the_way')}
                    className="bg-blue-400 hover:bg-blue-300 text-blue-950 font-extrabold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer"
                  >
                    2. Mulai Perjalanan Antar Penumpang
                  </button>
                )}
                {activeRide.status === 'on_the_way' && (
                  <button
                    onClick={() => onUpdateRideStatus(activeRide.id, 'completed')}
                    className="bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black text-xs px-6 py-3 rounded-xl transition-all cursor-pointer shadow-lg"
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

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {onOpenChat && (
                  <>
                    <button
                      onClick={() => onOpenChat({ id: activeFoodDelivery.storeId, name: activeFoodDelivery.storeName, role: 'seller' }, { orderId: activeFoodDelivery.id, contextTitle: `Pemilik Toko (${activeFoodDelivery.storeName})` })}
                      className="bg-amber-500/30 hover:bg-amber-500/50 text-white font-bold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Chat Penjual Toko
                    </button>

                    <button
                      onClick={() => onOpenChat({ id: activeFoodDelivery.buyerId || 'usr-buyer-1', name: activeFoodDelivery.buyerName, role: 'buyer', phone: activeFoodDelivery.buyerPhone }, { orderId: activeFoodDelivery.id, contextTitle: `Pemesan Makanan (${activeFoodDelivery.buyerName})` })}
                      className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Chat Pemesan
                    </button>
                  </>
                )}

                {activeFoodDelivery.status === 'delivering' && (
                  <button
                    onClick={() => onUpdateOrderStatus(activeFoodDelivery.id, 'completed')}
                    className="bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black text-xs px-6 py-3 rounded-xl transition-all cursor-pointer"
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <div className="lg:col-span-6 space-y-4">
          <h3 className="font-extrabold text-lg text-zinc-900 dark:text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-600 animate-spin" />
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
            <div className="space-y-4">
              
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

        {/* Live Radar Map Column */}
        <div className="lg:col-span-6 bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
          <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white">Peta Live Driver Maleber</h4>
          <div className="h-96 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner">
            <MapComponent
              drivers={orders.map(() => driver)}
            />
          </div>
        </div>

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

    </div>
  );
}
