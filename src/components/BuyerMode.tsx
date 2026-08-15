'use client';

import React, { useState, useCallback } from 'react';
import { Store, Product, DriverInfo, Order, RideRequest, UserRole, UserProfile, SavedAddress, PlacePOI } from '@/types';
import MapComponent from './MapComponent';
import RouteMapComponent from './RouteMapComponent';
import { MALEBER_CENTER, INITIAL_PLACES } from '@/lib/mockData';
import { calculateRoadDistance, calculateOjekFare, formatDistanceText, getOSRMRoute, getDistanceMeters } from '@/lib/geoUtils';
import { ShoppingBag, Bike, Star, Clock, MapPin, Search, ArrowRight, ShieldCheck, CheckCircle2, ChevronRight, XCircle, AlertCircle, MessageSquare, Crosshair, Activity, FileText } from 'lucide-react';
import RatingModal, { RatingStep } from './RatingModal';
import CancelReasonModal from './CancelReasonModal';
import AddToCartModal from './AddToCartModal';
import { calculateRideFees, BUYER_APP_FEE, formatRupiah } from '@/lib/feeCalculator';

interface BuyerModeProps {
  stores: Store[];
  products: Product[];
  drivers: DriverInfo[];
  orders: Order[];
  rides: RideRequest[];
  places?: PlacePOI[];
  savedAddresses?: SavedAddress[];
  onAddToCart: (product: Product, quantity?: number, notes?: string) => void;
  onCreateRide: (
    pickupAddress: string,
    pickupLat: number,
    pickupLng: number,
    destAddress: string,
    destLat: number,
    destLng: number,
    distanceKm: number,
    fare: number,
    paymentMethod?: 'qris' | 'cod',
    paymentStatus?: 'paid' | 'unpaid' | 'cod'
  ) => void;
  onSubmitRating: (targetId: string, targetType: 'store' | 'driver' | 'product', rating: number, comment: string) => void;
  onSelectProductDetail?: (product: Product) => void;
  onCancelOrder?: (orderId: string, reason?: string) => void;
  onCancelRide?: (rideId: string, reason?: string) => void;
  onOpenChat?: (
    targetUser: { id: string; name: string; role: UserRole; phone?: string; avatar?: string },
    options?: { orderId?: string; rideId?: string; contextTitle?: string }
  ) => void;
  currentUser?: UserProfile | null;
}

const MALEBER_SPOTS = [
  { name: 'Kantor Desa Maleber', lat: -6.8155, lng: 107.1865 },
  { name: 'Simpang Maleber (Jl. Raya Bandung-Cianjur)', lat: -6.8110, lng: 107.1890 },
  { name: 'Masjid Jami Desa Maleber', lat: -6.8148, lng: 107.1870 },
  { name: 'SD Negeri Maleber 1', lat: -6.8160, lng: 107.1850 },
  { name: 'Dusun Sukamaju Maleber', lat: -6.8162, lng: 107.1855 },
  { name: 'Blok Sawah Maleber Kidul', lat: -6.8170, lng: 107.1850 }
];

export default function BuyerMode({
  stores,
  products,
  drivers,
  orders,
  rides,
  places = INITIAL_PLACES,
  savedAddresses = [],
  onAddToCart,
  onCreateRide,
  onSubmitRating,
  onSelectProductDetail,
  onCancelOrder,
  onCancelRide,
  onOpenChat,
  currentUser
}: BuyerModeProps) {
  const [activeSubTab, setActiveSubTab] = useState<'marketplace' | 'ojek' | 'history'>('marketplace');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('semua');
  const [confirmAddToCartProduct, setConfirmAddToCartProduct] = useState<Product | null>(null);

  // Ojek Form State
  const [isManualLocation, setIsManualLocation] = useState(false);
  const [pickupSpot, setPickupSpot] = useState(MALEBER_SPOTS[0]);
  const [destSpot, setDestSpot] = useState(MALEBER_SPOTS[1]);
  const [calcDistance, setCalcDistance] = useState(1.2);
  const [calcFare, setCalcFare] = useState(8000);
  const [showRideConfirm, setShowRideConfirm] = useState(false);
  const [isSubmittingRide, setIsSubmittingRide] = useState(false);
  const [mapSelectionMode, setMapSelectionMode] = useState<'pickup' | 'dest' | null>(null);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [isLocatingGPSDest, setIsLocatingGPSDest] = useState(false);
  const [pickupGeoAddress, setPickupGeoAddress] = useState<string | null>(null);
  const [destGeoAddress, setDestGeoAddress] = useState<string | null>(null);

  // Rating & Cancel Modal State
  const [ratingTarget, setRatingTarget] = useState<{ id: string; name: string; type: 'store' | 'driver' | 'product'; steps?: RatingStep[] } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; type: 'order' | 'ride'; title: string } | null>(null);

  // Aktivitas Tab Filter & Detail Modal State
  const [activitySubTab, setActivitySubTab] = useState<'ongoing' | 'history'>('ongoing');
  const [selectedActivityDetail, setSelectedActivityDetail] = useState<{
    type: 'order' | 'ride';
    data: Order | RideRequest;
  } | null>(null);

  // --- Reverse Geocoding via OpenStreetMap Nominatim ---
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string | null> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=id`,
        { headers: { 'Accept-Language': 'id' } }
      );
      if (!res.ok) return null;
      const data = await res.json();
      // Build a human-readable address from Nominatim response
      const addr = data.address || {};
      const parts = [
        addr.road || addr.pedestrian || addr.footway || addr.path,
        addr.village || addr.suburb || addr.neighbourhood,
        addr.city_district || addr.district || addr.county,
        addr.city || addr.town || addr.municipality
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : (data.display_name?.split(',').slice(0, 3).join(',') ?? null);
    } catch {
      return null;
    }
  }, []);

  const handleGetCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Browser Anda tidak mendukung fitur lokasi GPS.');
      return;
    }
    setIsLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const geoAddr = await reverseGeocode(latitude, longitude);
        setPickupSpot({
          name: geoAddr ? `📍 ${geoAddr}` : `📍 Lokasi Saya (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          lat: latitude,
          lng: longitude
        });
        setPickupGeoAddress(geoAddr);
        setIsLocatingGPS(false);
      },
      (err) => {
        console.error(err);
        setIsLocatingGPS(false);
        alert('Gagal mengambil lokasi GPS. Mohon pastikan izin lokasi di HP/Browser diizinkan.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleGetCurrentLocationDest = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Browser Anda tidak mendukung fitur lokasi GPS.');
      return;
    }
    setIsLocatingGPSDest(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const geoAddr = await reverseGeocode(latitude, longitude);
        setDestSpot({
          name: geoAddr ? `📍 ${geoAddr}` : `📍 Lokasi Saya (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          lat: latitude,
          lng: longitude
        });
        setDestGeoAddress(geoAddr);
        setIsLocatingGPSDest(false);
      },
      (err) => {
        console.error(err);
        setIsLocatingGPSDest(false);
        alert('Gagal mengambil lokasi GPS. Mohon pastikan izin lokasi di HP/Browser diizinkan.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Automatically calculate real turn-by-turn road distance & fare via OSRM API whenever pickupSpot or destSpot changes
  const [calcDuration, setCalcDuration] = useState(5);
  const [calcRoadBreakdown, setCalcRoadBreakdown] = useState('Via Jalan Utama Maleber');

  React.useEffect(() => {
    let isCancelled = false;
    getOSRMRoute(pickupSpot.lat, pickupSpot.lng, destSpot.lat, destSpot.lng).then((res) => {
      if (!isCancelled) {
        setCalcDistance(res.distanceKm);
        setCalcFare(res.fare);
        setCalcDuration(res.durationMins);
        setCalcRoadBreakdown(res.roadTypeBreakdown || 'Via Jalan Utama Maleber');
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [pickupSpot.lat, pickupSpot.lng, destSpot.lat, destSpot.lng]);

  const [ridePaymentMethod, setRidePaymentMethod] = useState<'qris' | 'cod'>('qris');

  const handleFinalRideSubmit = async () => {
    if (isSubmittingRide) return;

    // Strict Network & Internet Check
    if (typeof window !== 'undefined' && !navigator.onLine) {
      alert('⚠️ Koneksi Internet Terputus!\nPastikan koneksi internet HP/Browser Anda aktif sebelum memesan ojek.');
      return;
    }

    setIsSubmittingRide(true);
    try {
      if (ridePaymentMethod === 'qris') {
        const { checkoutWithMidtrans } = await import('@/lib/midtrans');
        const customRideId = `RIDE-${Date.now()}`;
        await checkoutWithMidtrans({
          orderId: customRideId,
          grossAmount: calcFare + BUYER_APP_FEE,
          customerName: currentUser?.name || 'Penumpang Maleber',
          items: [
            {
              productId: 'ojek-maleber',
              productName: `Ojek Express (${pickupSpot.name.slice(0, 15)} -> ${destSpot.name.slice(0, 15)})`,
              price: calcFare,
              quantity: 1
            },
            {
              productId: 'fee-app',
              productName: 'Biaya Jasa Aplikasi',
              price: BUYER_APP_FEE,
              quantity: 1
            }
          ],
          onSuccess: async (result: any) => {
            console.log('[Midtrans Ojek QRIS onSuccess]', result);
            try {
              const verifyRes = await fetch('/api/midtrans/verify-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: customRideId })
              });
              const verifyData = await verifyRes.json();
              if (verifyData.success && verifyData.isPaid) {
                await onCreateRide(
                  pickupSpot.name,
                  pickupSpot.lat,
                  pickupSpot.lng,
                  destSpot.name,
                  destSpot.lat,
                  destSpot.lng,
                  calcDistance,
                  calcFare,
                  'qris',
                  'paid'
                );
                setShowRideConfirm(false);
                setActiveSubTab('history');
                return;
              }
            } catch (err) {
              console.error('Verify status API error:', err);
            }

            const status = result?.transaction_status;
            if (status === 'settlement' || status === 'capture') {
              await onCreateRide(
                pickupSpot.name,
                pickupSpot.lat,
                pickupSpot.lng,
                destSpot.name,
                destSpot.lat,
                destSpot.lng,
                calcDistance,
                calcFare,
                'qris',
                'paid'
              );
              setShowRideConfirm(false);
              setActiveSubTab('history');
            } else {
              alert('Pembayaran Ojek QRIS Belum Diselesaikan atau Dibatalkan. Pemesanan ojek tidak diproses.');
              setIsSubmittingRide(false);
            }
          },
          onPending: async (result: any) => {
            console.log('[Midtrans Ojek QRIS onPending]', result);
            try {
              const verifyRes = await fetch('/api/midtrans/verify-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: customRideId })
              });
              const verifyData = await verifyRes.json();
              if (verifyData.success && verifyData.isPaid) {
                await onCreateRide(
                  pickupSpot.name,
                  pickupSpot.lat,
                  pickupSpot.lng,
                  destSpot.name,
                  destSpot.lat,
                  destSpot.lng,
                  calcDistance,
                  calcFare,
                  'qris',
                  'paid'
                );
                setShowRideConfirm(false);
                setActiveSubTab('history');
                return;
              }
            } catch (err) {
              console.error('Verify status API error:', err);
            }

            alert('Pembayaran Ojek QRIS Belum Diselesaikan (Pending/Batal). Pemesanan ojek tidak diproses.');
            setIsSubmittingRide(false);
          },
          onError: (result: any) => {
            console.warn('[Midtrans Ojek QRIS onError]', result);
            alert('Pembayaran Ojek QRIS Gagal atau Dibatalkan. Pemesanan tidak diproses.');
            setIsSubmittingRide(false);
          },
          onClose: () => {
            console.log('[Midtrans Ojek QRIS onClose]');
            alert('Pembayaran QRIS Dibatalkan. Pemesanan ojek tidak diproses.');
            setIsSubmittingRide(false);
          }
        });
      } else {
        await onCreateRide(
          pickupSpot.name,
          pickupSpot.lat,
          pickupSpot.lng,
          destSpot.name,
          destSpot.lat,
          destSpot.lng,
          calcDistance,
          calcFare,
          'cod',
          'cod'
        );
        setShowRideConfirm(false);
        setActiveSubTab('history');
      }
    } catch (e: any) {
      console.error('Ride submit error:', e);
      alert(`⚠️ Kendala pemesanan ojek: ${e.message || 'Error koneksi'}`);
    } finally {
      setIsSubmittingRide(false);
    }
  };

  // Filter products by category, search query, AND store active status (toko harus BUKA)
  const filteredProducts = products.filter((p) => {
    const parentStore = stores.find((s) => s.id === p.storeId);
    // If parent store is closed (isActive === false), HIDE products from buyer marketplace!
    if (parentStore && parentStore.isActive === false) {
      return false;
    }
    const matchesCategory = selectedCategory === 'semua' || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Check if current logged-in user has any ongoing order or ride activity
  const hasUserOngoingActivity = currentUser ? (
    orders.some((o) => (o.buyerId === currentUser.id || (currentUser.phone && o.buyerPhone && o.buyerPhone.replace(/[^0-9]/g, '') === currentUser.phone.replace(/[^0-9]/g, ''))) && o.status !== 'completed' && o.status !== 'cancelled') ||
    rides.some((r) => (r.passengerId === currentUser.id || (currentUser.phone && r.passengerPhone && r.passengerPhone.replace(/[^0-9]/g, '') === currentUser.phone.replace(/[^0-9]/g, ''))) && r.status !== 'completed' && r.status !== 'cancelled')
  ) : false;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Buyer Mode Navigation Tabs — COMPACT & SCROLLABLE ON MOBILE */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSubTab('marketplace')}
          className={`pb-2.5 sm:pb-3.5 px-3.5 sm:px-6 font-extrabold text-xs sm:text-sm border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'marketplace'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Produk UMKM
        </button>

        <button
          onClick={() => setActiveSubTab('ojek')}
          className={`pb-2.5 sm:pb-3.5 px-3.5 sm:px-6 font-extrabold text-xs sm:text-sm border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'ojek'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Bike className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Ojek Online
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`pb-2.5 sm:pb-3.5 px-3.5 sm:px-6 font-extrabold text-xs sm:text-sm border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap relative ${
            activeSubTab === 'history'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Aktivitas</span>
          {hasUserOngoingActivity && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block shrink-0" title="Ada aktivitas berjalan"></span>
          )}
        </button>
      </div>

      {/* SUB TAB 1: MARKETPLACE UMKM (KATALOG PRODUK & DETAIL VIEW) */}
      {activeSubTab === 'marketplace' && (
        <div className="space-y-6">
          
          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Cari Nasi Liwet, Beras Pandanwangi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
              {['semua', 'Kuliner', 'Hasil Tani', 'Kerajinan'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {cat === 'semua' ? 'Semua Kategori' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid — 2 CARDS PER ROW ON MOBILE */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {filteredProducts.map((product) => {
              const store = stores.find((s) => s.id === product.storeId);
              return (
                <div
                  key={product.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {/* Image Thumbnail */}
                    <div
                      className="relative h-32 sm:h-44 overflow-hidden cursor-pointer"
                      onClick={() => onSelectProductDetail && onSelectProductDetail(product)}
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5 sm:p-3">
                        <span className="text-white text-[11px] sm:text-xs font-bold flex items-center gap-1">
                          Detail <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </span>
                      </div>
                      <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-zinc-900/80 backdrop-blur-md text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full">
                        {product.category}
                      </span>
                    </div>

                    {/* Product Info */}
                    <div className="p-3 sm:p-4 space-y-1 sm:space-y-2">
                      <h4
                        onClick={() => onSelectProductDetail && onSelectProductDetail(product)}
                        className="font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-white line-clamp-1 cursor-pointer hover:text-emerald-600 transition-colors"
                      >
                        {product.name}
                      </h4>
                      <p className="text-[10px] sm:text-xs text-zinc-500 line-clamp-2 leading-tight sm:leading-relaxed">
                        {product.description}
                      </p>

                      <div className="flex items-center justify-between text-[10px] sm:text-xs pt-1">
                        <span className="text-zinc-500 font-semibold truncate max-w-[90px] sm:max-w-none">{store?.name || 'UMKM Maleber'}</span>
                        <span className="text-amber-500 font-bold flex items-center gap-0.5 shrink-0">
                          ⭐ {product.rating || 5.0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Add to Cart Action */}
                  <div className="p-3 sm:p-4 pt-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 border-t border-zinc-100 dark:border-zinc-800/80 mt-1.5 sm:mt-2">
                    <div>
                      <span className="text-[9px] sm:text-[10px] text-zinc-400 block">Harga</span>
                      <span className="text-xs sm:text-base font-black text-emerald-600 dark:text-emerald-400">
                        Rp {product.price.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <button
                      onClick={() => setConfirmAddToCartProduct(product)}
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] sm:text-xs px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer text-center"
                    >
                      + Keranjang
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* SUB TAB 2: OJEK ONLINE DESA MALEBER */}
      {activeSubTab === 'ojek' && (() => {
        // Local state-like flags derived from existing state
        const pickupConfirmed = pickupGeoAddress !== null || pickupSpot.name !== MALEBER_SPOTS[0].name;
        const destConfirmed = destGeoAddress !== null || destSpot.name !== MALEBER_SPOTS[1].name;
        const bothConfirmed = pickupConfirmed && destConfirmed;
        const nearbyDriversCount = drivers.filter((d) => {
          if (!d.isOnline) return false;
          if (pickupSpot) {
            const distM = getDistanceMeters(pickupSpot.lat, pickupSpot.lng, d.lat, d.lng);
            return distM <= 1500;
          }
          return true;
        }).length;

        // ═══ FULLSCREEN MAP OVERLAY FOR PICKUP ═══
        if (mapSelectionMode === 'pickup') {
          return (
            <div className="fixed inset-0 z-[99999] bg-black">
              <div className="absolute inset-0">
                <MapComponent
                  className="h-full w-full"
                  center={{ lat: pickupSpot.lat, lng: pickupSpot.lng }}
                  zoom={17}
                  stores={[]}
                  drivers={drivers}
                  places={places}
                  selectionMode="pickup"
                  pickupLocation={{ lat: pickupSpot.lat, lng: pickupSpot.lng, address: pickupSpot.name }}
                  onSelectPickup={async (lat, lng) => {
                    const geoAddr = await reverseGeocode(lat, lng);
                    setPickupSpot({
                      name: geoAddr ? `${geoAddr}` : `Pin Jemput (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                      lat,
                      lng
                    });
                    setPickupGeoAddress(geoAddr || `Lokasi (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
                  }}
                />
              </div>

              {/* Clean Top Floating Bar */}
              <div className="fixed top-3 left-3 right-3 z-[99999] flex items-center justify-between gap-2 max-w-lg mx-auto pointer-events-none">
                <button
                  type="button"
                  onClick={() => setMapSelectionMode(null)}
                  className="pointer-events-auto bg-zinc-900/90 backdrop-blur-md text-white h-9 px-3 rounded-full shadow-xl border border-white/15 flex items-center justify-center gap-1.5 hover:bg-black transition-all text-xs font-bold shrink-0 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4 rotate-180 text-white" />
                  <span className="hidden sm:inline">Kembali</span>
                </button>

                <div className="bg-zinc-900/90 backdrop-blur-md px-4 py-1.5 rounded-full shadow-xl border border-emerald-500/40 text-center pointer-events-auto truncate max-w-[200px] sm:max-w-xs">
                  <p className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                    Titik Penjemputan
                  </p>
                  <p className="text-[11px] font-medium text-zinc-200 truncate">
                    Geser peta untuk memilih
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={isLocatingGPS}
                  className="pointer-events-auto bg-emerald-600 hover:bg-emerald-500 text-white h-9 px-3.5 rounded-full shadow-xl flex items-center justify-center gap-1.5 transition-all text-xs font-extrabold border border-emerald-400/30 shrink-0 cursor-pointer"
                >
                  <Crosshair className={`w-3.5 h-3.5 ${isLocatingGPS ? 'animate-spin' : ''}`} />
                  <span>{isLocatingGPS ? '...' : 'GPS'}</span>
                </button>
              </div>

              {/* Confirm Location Bottom Sheet Card */}
              <div className="fixed bottom-4 left-3 right-3 z-[99999] max-w-md mx-auto pointer-events-none">
                <div className="bg-zinc-900/95 backdrop-blur-md p-3.5 rounded-3xl border border-zinc-800 shadow-2xl space-y-2.5 pointer-events-auto">
                  <div className="flex items-center gap-2 px-1 text-zinc-200 text-xs font-medium truncate">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">{pickupGeoAddress || pickupSpot.name || 'Lokasi Terpilih di Peta'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!pickupGeoAddress) {
                        setPickupGeoAddress(pickupSpot.name);
                      }
                      setMapSelectionMode(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm py-3 px-5 rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all w-full cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Konfirmasi Titik Penjemputan
                  </button>
                </div>
              </div>
            </div>
          );
        }

        // ═══ FULLSCREEN MAP OVERLAY FOR DESTINATION ═══
        if (mapSelectionMode === 'dest') {
          return (
            <div className="fixed inset-0 z-[99999] bg-black">
              <div className="absolute inset-0">
                <MapComponent
                  className="h-full w-full"
                  center={{ lat: destSpot.lat, lng: destSpot.lng }}
                  zoom={17}
                  stores={[]}
                  drivers={drivers}
                  places={places}
                  selectionMode="dest"
                  destLocation={{ lat: destSpot.lat, lng: destSpot.lng, address: destSpot.name }}
                  onSelectDest={async (lat, lng) => {
                    const geoAddr = await reverseGeocode(lat, lng);
                    setDestSpot({
                      name: geoAddr ? `${geoAddr}` : `Pin Tujuan (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                      lat,
                      lng
                    });
                    setDestGeoAddress(geoAddr || `Lokasi (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
                  }}
                />
              </div>

              {/* Clean Top Floating Bar */}
              <div className="fixed top-3 left-3 right-3 z-[99999] flex items-center justify-between gap-2 max-w-lg mx-auto pointer-events-none">
                <button
                  type="button"
                  onClick={() => setMapSelectionMode(null)}
                  className="pointer-events-auto bg-zinc-900/90 backdrop-blur-md text-white h-9 px-3 rounded-full shadow-xl border border-white/15 flex items-center justify-center gap-1.5 hover:bg-black transition-all text-xs font-bold shrink-0 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4 rotate-180 text-white" />
                  <span className="hidden sm:inline">Kembali</span>
                </button>

                <div className="bg-zinc-900/90 backdrop-blur-md px-4 py-1.5 rounded-full shadow-xl border border-rose-500/40 text-center pointer-events-auto truncate max-w-[200px] sm:max-w-xs">
                  <p className="text-[10px] font-extrabold text-rose-400 uppercase tracking-wider">
                    Titik Tujuan
                  </p>
                  <p className="text-[11px] font-medium text-zinc-200 truncate">
                    Geser peta untuk memilih
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGetCurrentLocationDest}
                  disabled={isLocatingGPSDest}
                  className="pointer-events-auto bg-rose-600 hover:bg-rose-500 text-white h-9 px-3.5 rounded-full shadow-xl flex items-center justify-center gap-1.5 transition-all text-xs font-extrabold border border-rose-400/30 shrink-0 cursor-pointer"
                >
                  <Crosshair className={`w-3.5 h-3.5 ${isLocatingGPSDest ? 'animate-spin' : ''}`} />
                  <span>{isLocatingGPSDest ? '...' : 'GPS'}</span>
                </button>
              </div>

              {/* Confirm Location Bottom Sheet Card */}
              <div className="fixed bottom-4 left-3 right-3 z-[99999] max-w-md mx-auto pointer-events-none">
                <div className="bg-zinc-900/95 backdrop-blur-md p-3.5 rounded-3xl border border-zinc-800 shadow-2xl space-y-2.5 pointer-events-auto">
                  <div className="flex items-center gap-2 px-1 text-zinc-200 text-xs font-medium truncate">
                    <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="truncate">{destGeoAddress || destSpot.name || 'Lokasi Terpilih di Peta'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!destGeoAddress) {
                        setDestGeoAddress(destSpot.name);
                      }
                      setMapSelectionMode(null);
                    }}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs sm:text-sm py-3 px-5 rounded-2xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all w-full cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Konfirmasi Titik Tujuan
                  </button>
                </div>
              </div>
            </div>
          );
        }

        // ═══ MAIN OJEK FORM ═══
        return (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5 max-w-5xl mx-auto">
            
            {/* Header Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="space-y-1">
                <span className="text-[9px] sm:text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Layanan Antar Jemput Warga
                </span>
                <h3 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white">
                  Pesan Ojek Online Maleber
                </h3>
                <p className="text-xs text-zinc-500">
                  Pilih lokasi jemput & tujuan via Peta Fullscreen, GPS, atau Alamat Favorit
                </p>
              </div>
              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold px-3 py-1 rounded-full self-start sm:self-center">
                ● {nearbyDriversCount} Driver Online (Radius 1.5 km)
              </span>
            </div>

            {/* ── STEP 1: PICKUP LOCATION ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-zinc-900 dark:text-white flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">A</span>
                Titik Penjemputan
              </h4>

              {pickupConfirmed ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/50 p-3.5 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/50 flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-extrabold text-emerald-600 uppercase">Lokasi Jemput Terpilih</p>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{pickupSpot.name}</p>
                    {pickupGeoAddress && <p className="text-[10px] text-zinc-500 truncate">{pickupGeoAddress}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMapSelectionMode('pickup')}
                    className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer shrink-0"
                  >
                    Ubah
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    // Default to GPS before opening map
                    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setPickupSpot({ name: `📍 Lokasi Saya`, lat: pos.coords.latitude, lng: pos.coords.longitude });
                        },
                        () => {},
                        { timeout: 3000 }
                      );
                    }
                    setMapSelectionMode('pickup');
                  }}
                  className="w-full p-4 rounded-2xl border-2 border-dashed border-emerald-400 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100 transition-all cursor-pointer flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">📍 Pilih Lokasi Jemput</p>
                    <p className="text-[11px] text-zinc-500">Buka peta fullscreen untuk pilih titik penjemputan</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-emerald-600 ml-auto shrink-0" />
                </button>
              )}

              {/* Saved Address Pills for Pickup */}
              {savedAddresses.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[10px] font-extrabold text-zinc-400 shrink-0">Favorit:</span>
                  {savedAddresses.map((sa) => (
                    <button
                      type="button"
                      key={sa.id}
                      onClick={() => {
                        setPickupSpot({ name: `${sa.label}: ${sa.name}`, lat: sa.lat, lng: sa.lng });
                        setPickupGeoAddress(sa.name);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all shrink-0 cursor-pointer ${
                        pickupSpot.name.includes(sa.name)
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {sa.label === 'Rumah' ? '🏠' : sa.label === 'Kantor' ? '🏢' : '📍'} {sa.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── STEP 2: DESTINATION LOCATION ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-zinc-900 dark:text-white flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">B</span>
                Lokasi Tujuan
              </h4>

              {destConfirmed ? (
                <div className="bg-rose-50 dark:bg-rose-950/50 p-3.5 rounded-2xl border border-rose-200/70 dark:border-rose-800/50 flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-extrabold text-rose-600 uppercase">Lokasi Tujuan Terpilih</p>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{destSpot.name}</p>
                    {destGeoAddress && <p className="text-[10px] text-zinc-500 truncate">{destGeoAddress}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMapSelectionMode('dest')}
                    className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer shrink-0"
                  >
                    Ubah
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setDestSpot({ name: `🏁 Lokasi Saya`, lat: pos.coords.latitude, lng: pos.coords.longitude });
                        },
                        () => {},
                        { timeout: 3000 }
                      );
                    }
                    setMapSelectionMode('dest');
                  }}
                  className="w-full p-4 rounded-2xl border-2 border-dashed border-rose-400 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 transition-all cursor-pointer flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-rose-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-rose-700 dark:text-rose-300">🏁 Pilih Lokasi Tujuan</p>
                    <p className="text-[11px] text-zinc-500">Buka peta fullscreen untuk pilih titik tujuan</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-rose-600 ml-auto shrink-0" />
                </button>
              )}

              {/* Saved Address Pills for Destination */}
              {savedAddresses.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[10px] font-extrabold text-zinc-400 shrink-0">Favorit:</span>
                  {savedAddresses.map((sa) => (
                    <button
                      type="button"
                      key={sa.id}
                      onClick={() => {
                        setDestSpot({ name: `${sa.label}: ${sa.name}`, lat: sa.lat, lng: sa.lng });
                        setDestGeoAddress(sa.name);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all shrink-0 cursor-pointer ${
                        destSpot.name.includes(sa.name)
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {sa.label === 'Rumah' ? '🏠' : sa.label === 'Kantor' ? '🏢' : '📍'} {sa.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── STEP 3: ROUTE MAP + FARE (only after both confirmed) ── */}
            {bothConfirmed && (
              <>
                {/* Route Map Preview */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Rute Perjalanan
                  </h4>
                  <div className="h-52 sm:h-64 md:h-80 w-full rounded-2xl overflow-hidden shadow-xl">
                    <RouteMapComponent
                      key={`route-${pickupSpot.lat.toFixed(4)}-${destSpot.lat.toFixed(4)}`}
                      className="h-full w-full rounded-none"
                      pickupLocation={{ lat: pickupSpot.lat, lng: pickupSpot.lng, address: pickupSpot.name }}
                      destLocation={{ lat: destSpot.lat, lng: destSpot.lng, address: destSpot.name }}
                    />
                  </div>
                </div>

                {/* Fare & Distance */}
                <div className="bg-emerald-50 dark:bg-emerald-950/60 p-4 sm:p-5 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      Algoritma Smart Routing AI
                    </span>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-sm">
                      Rute Tercepat
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-700 dark:text-zinc-300 font-medium">
                    <span className="font-bold text-zinc-900 dark:text-white">{calcRoadBreakdown}</span>
                  </p>
                  <div className="flex justify-between items-center text-xs text-zinc-600 dark:text-zinc-400 font-medium border-t border-emerald-200/60 dark:border-emerald-800/40 pt-2">
                    <span>Estimasi Jarak &amp; Waktu Tempuh:</span>
                    <span className="font-bold text-zinc-900 dark:text-white tabular-nums">{calcDistance} km (~{calcDuration} mnt)</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-emerald-200/60 dark:border-emerald-800/40 pt-2.5">
                    <span className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200">Tarif Ojek Maleber:</span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                      Rp {calcFare.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* RIDE ORDER BUTTON */}
                <button
                  onClick={() => setShowRideConfirm(true)}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm sm:text-base py-3.5 sm:py-4 rounded-2xl shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer btn-ripple"
                >
                  <Bike className="w-5 h-5" />
                  Pesan Ojek Sekarang (Rp {calcFare.toLocaleString('id-ID')})
                </button>
              </>
            )}

            {!bothConfirmed && (
              <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl text-center space-y-1 border border-zinc-200/60 dark:border-zinc-700/60">
                <p className="text-xs font-bold text-zinc-500">
                  {!pickupConfirmed && !destConfirmed
                    ? '📍 Pilih lokasi jemput & tujuan untuk melihat estimasi tarif'
                    : !pickupConfirmed
                    ? '📍 Pilih lokasi jemput untuk melanjutkan'
                    : '🏁 Pilih lokasi tujuan untuk melihat estimasi tarif'
                  }
                </p>
              </div>
            )}

          {/* RIDE CONFIRMATION MODAL POPUP */}
          {showRideConfirm && (
            <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-zinc-200 dark:border-zinc-800 relative">
                <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center text-lg font-bold">
                      🛵
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">Konfirmasi Pemesanan Ojek</h3>
                      <span className="text-[10px] text-zinc-500 font-medium">Layanan Ojek Maleber Express</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRideConfirm(false)}
                    className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold flex items-center justify-center cursor-pointer hover:bg-zinc-200"
                  >
                    ✕
                  </button>
                </div>

                {/* Address Details */}
                <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl space-y-3 text-xs border border-zinc-200/60 dark:border-zinc-700/60">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      A
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-emerald-600 uppercase">Titik Penjemputan</span>
                      <p className="font-bold text-zinc-900 dark:text-white mt-0.5">{pickupSpot.name}</p>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-zinc-200 dark:border-zinc-700 pt-2.5 flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      B
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-rose-600 uppercase">Titik Tujuan</span>
                      <p className="font-bold text-zinc-900 dark:text-white mt-0.5">{destSpot.name}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Method Selector (QRIS vs COD) */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-zinc-900 dark:text-white flex items-center gap-1.5">
                    💳 Pilih Metode Pembayaran:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRidePaymentMethod('qris')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        ridePaymentMethod === 'qris'
                          ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                          : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-zinc-900 dark:text-white flex items-center gap-1">
                          📱 QRIS Midtrans
                        </span>
                        {ridePaymentMethod === 'qris' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1 leading-tight">
                        Scan via GoPay, ShopeePay, Dana, OVO, &amp; Banking
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRidePaymentMethod('cod')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        ridePaymentMethod === 'cod'
                          ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                          : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-zinc-900 dark:text-white flex items-center gap-1">
                          💵 Bayar COD (Tunai)
                        </span>
                        {ridePaymentMethod === 'cod' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1 leading-tight">
                        Bayar tunai ke driver saat sampai di lokasi tujuan
                      </p>
                    </button>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="bg-emerald-50 dark:bg-emerald-950/50 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Estimasi Jarak Tempuh</span>
                    <span className="font-bold tabular-nums">{calcDistance} km</span>
                  </div>
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Tarif Ojek</span>
                    <span className="font-bold tabular-nums">{formatRupiah(calcFare)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Biaya Jasa Aplikasi &amp; Operasional</span>
                    <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{formatRupiah(BUYER_APP_FEE)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Metode Pembayaran</span>
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
                      {ridePaymentMethod === 'qris' ? '📱 QRIS Instant Midtrans' : '💵 Tunai / COD'}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-black text-emerald-800 dark:text-emerald-300 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                    <span>Total Bayar</span>
                    <span className="tabular-nums">{formatRupiah(calcFare + BUYER_APP_FEE)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRideConfirm(false)}
                    disabled={isSubmittingRide}
                    className="flex-1 py-3 text-xs font-bold rounded-2xl text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 cursor-pointer"
                  >
                    Cek Kembali
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalRideSubmit}
                    disabled={isSubmittingRide}
                    className="flex-1 py-3 text-xs font-black rounded-2xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isSubmittingRide ? 'Memproses...' : 'Ya, Pesan Ojek'}
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )})()}

      {/* SUB TAB 3: AKTIVITAS SAYA (ON GOING & RIWAYAT TRANSAKSI) */}
      {activeSubTab === 'history' && (
        <div className="space-y-6">
          {/* Header & Sub-filter Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div>
              <h3 className="font-black text-xl text-zinc-900 dark:text-white">Aktivitas Layanan Maleber</h3>
              <p className="text-xs text-zinc-500">Lacak pesanan berjalan &amp; cek riwayat transaksi Anda</p>
            </div>

            {/* Filter Toggle Pill */}
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl self-start sm:self-auto border border-zinc-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setActivitySubTab('ongoing')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activitySubTab === 'ongoing'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Sedang Berjalan</span>
              </button>
              <button
                type="button"
                onClick={() => setActivitySubTab('history')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activitySubTab === 'history'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Riwayat Selesai</span>
              </button>
            </div>
          </div>

          {/* Filter Orders & Rides based on Sub-Tab & Current Logged-in User */}
          {(() => {
            const userOrders = orders.filter((o) => {
              if (!currentUser) return false;
              const isMatchId = o.buyerId === currentUser.id;
              const isMatchPhone = currentUser.phone && o.buyerPhone && currentUser.phone.length > 5 && o.buyerPhone.replace(/[^0-9]/g, '') === currentUser.phone.replace(/[^0-9]/g, '');
              return isMatchId || isMatchPhone;
            });

            const userRides = rides.filter((r) => {
              if (!currentUser) return false;
              const isMatchId = r.passengerId === currentUser.id;
              const isMatchPhone = r.passengerPhone && currentUser.phone && currentUser.phone.length > 5 && r.passengerPhone.replace(/[^0-9]/g, '') === currentUser.phone.replace(/[^0-9]/g, '');
              return isMatchId || isMatchPhone;
            });

            const filteredOrders = userOrders.filter((o) =>
              activitySubTab === 'ongoing'
                ? o.status !== 'completed' && o.status !== 'cancelled'
                : o.status === 'completed' || o.status === 'cancelled'
            );

            const filteredRides = userRides.filter((r) =>
              activitySubTab === 'ongoing'
                ? r.status !== 'completed' && r.status !== 'cancelled'
                : r.status === 'completed' || r.status === 'cancelled'
            );

            if (filteredOrders.length === 0 && filteredRides.length === 0) {
              return (
                <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-sm">
                  <Clock className="w-12 h-12 text-zinc-300 mx-auto" />
                  <p className="font-bold text-zinc-700 dark:text-zinc-300">
                    Tidak ada aktivitas {activitySubTab === 'ongoing' ? 'sedang berjalan' : 'riwayat transaksi'}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {activitySubTab === 'ongoing'
                      ? 'Pesanan makanan atau ojek yang sedang diproses akan muncul di sini.'
                      : 'Riwayat transaksi makanan & ojek yang selesai akan tercatat di sini.'}
                  </p>
                </div>
              );
            }

            const combinedActivities = [
              ...filteredOrders.map((ord) => ({
                itemType: 'order' as const,
                data: ord,
                timestamp: new Date(ord.createdAt || 0).getTime()
              })),
              ...filteredRides.map((rd) => ({
                itemType: 'ride' as const,
                data: rd,
                timestamp: new Date(rd.createdAt || 0).getTime()
              }))
            ].sort((a, b) => b.timestamp - a.timestamp);

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {combinedActivities.map((act) => {
                  if (act.itemType === 'order') {
                    const ord = act.data;
                    const isCancelled = ord.status === 'cancelled';
                    const isCompleted = ord.status === 'completed';
                    return (
                      <div
                        key={`order-${ord.id}`}
                        className={`p-5 rounded-3xl border shadow-sm space-y-4 transition-all cursor-pointer group ${
                          isCancelled || isCompleted
                            ? 'bg-zinc-50/70 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/60 opacity-60 grayscale-[20%]'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50'
                        }`}
                        onClick={() => setSelectedActivityDetail({ type: 'order', data: ord })}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                              🍔 Pesanan Makanan
                            </span>
                            <h4 className="font-extrabold text-base text-zinc-900 dark:text-white mt-1 group-hover:text-emerald-600 transition-colors">
                              {ord.storeName}
                            </h4>
                            <p className="text-xs text-zinc-500 truncate max-w-[200px]">Tujuan: {ord.deliveryAddress}</p>
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                            isCancelled
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : isCompleted
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 animate-pulse'
                          }`}>
                            {isCancelled ? 'DIBATALKAN' : isCompleted ? 'SELESAI' : ord.status === 'cooking' ? 'DISIAPKAN' : 'PROSES'}
                          </span>
                        </div>

                        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-2xl text-xs space-y-1">
                          {ord.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
                              <span>{item.quantity}x {item.productName}</span>
                              <span className="font-bold">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
                            </div>
                          ))}
                          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2 flex justify-between font-black text-emerald-600 text-xs">
                            <span>Total Biaya</span>
                            <span>Rp {ord.totalAmount.toLocaleString('id-ID')}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end pt-1 gap-2 flex-wrap border-t border-zinc-100 dark:border-zinc-800 pt-3">
                          <div className="flex gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                            {!isCancelled && !isCompleted && onOpenChat && (
                              <>
                                <button
                                  onClick={() => onOpenChat({ id: ord.storeId, name: ord.storeName, role: 'seller' }, { orderId: ord.id, contextTitle: `Penjual Toko (${ord.storeName})` })}
                                  className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  Chat Penjual
                                </button>

                                {/* Only show Chat Driver if a driver has actually taken/accepted the order */}
                                {Boolean(ord.driverId) && (
                                  <button
                                    onClick={() => onOpenChat({ id: ord.driverId!, name: ord.driverName || 'Kang Dede (Driver Maleber)', role: 'driver' }, { orderId: ord.id, contextTitle: `Kurir Driver (${ord.driverName || 'Kang Dede'})` })}
                                    className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-blue-200 transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Chat Kurir Driver
                                  </button>
                                )}
                              </>
                            )}
                            {(ord.status === 'pending' || ord.status === 'cooking') && (
                              <button
                                onClick={() => setCancelTarget({ id: ord.id, type: 'order', title: `Pesanan (${ord.storeName})` })}
                                className="bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-rose-200 transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Batalkan
                              </button>
                            )}
                            {isCompleted && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  onClick={() => setRatingTarget({ id: ord.storeId, name: ord.storeName, type: 'store' })}
                                  className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-amber-200 transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                                >
                                  <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                                  Rating Resto
                                </button>
                                {Boolean(ord.driverId) && (
                                  <button
                                    onClick={() => setRatingTarget({ id: ord.driverId!, name: ord.driverName || 'Driver Maleber', type: 'driver' })}
                                    className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-blue-200 transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                                  >
                                    <Star className="w-3.5 h-3.5 fill-current text-blue-500" />
                                    Rating Driver
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    const rd = act.data;
                    const isCancelled = rd.status === 'cancelled';
                    const isCompleted = rd.status === 'completed';
                    return (
                      <div
                        key={`ride-${rd.id}`}
                        className={`p-5 rounded-3xl border shadow-sm space-y-4 transition-all cursor-pointer group ${
                          isCancelled || isCompleted
                            ? 'bg-zinc-50/70 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/60 opacity-60 grayscale-[20%]'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50'
                        }`}
                        onClick={() => setSelectedActivityDetail({ type: 'ride', data: rd })}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full">
                              Ojek Online Maleber
                            </span>
                            <h4 className="font-extrabold text-base text-zinc-900 dark:text-white mt-1 group-hover:text-blue-600 transition-colors">
                              {rd.pickupAddress} &rarr; {rd.destAddress}
                            </h4>
                            <p className="text-xs text-zinc-500">Jarak Tempuh Rute: {rd.distanceKm} km</p>
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                            isCancelled
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : isCompleted
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 animate-pulse'
                          }`}>
                            {isCancelled ? 'DIBATALKAN' : isCompleted ? 'SELESAI' : 'PROSES'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-2xl text-xs font-black text-emerald-600">
                          <span>Tarif Ojek Maleber:</span>
                          <span>Rp {rd.fare.toLocaleString('id-ID')}</span>
                        </div>

                        <div className="flex items-center justify-end pt-1 gap-2 flex-wrap border-t border-zinc-100 dark:border-zinc-800 pt-3">
                          <div className="flex gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                            {!isCancelled && !isCompleted && rd.driverName && onOpenChat && (
                              <button
                                onClick={() => onOpenChat({ id: rd.driverId || 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', name: rd.driverName!, role: 'driver' }, { rideId: rd.id, contextTitle: `Driver Ojek Maleber` })}
                                className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-blue-200 transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Chat Driver
                              </button>
                            )}
                            {(rd.status === 'requested' || rd.status === 'accepted') && (
                              <button
                                onClick={() => setCancelTarget({ id: rd.id, type: 'ride', title: `Ojek Maleber (${rd.pickupAddress} ➔ ${rd.destAddress})` })}
                                className="bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-rose-200 transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Batalkan
                              </button>
                            )}
                            {isCompleted && (
                              <button
                                onClick={() => setRatingTarget({ id: rd.driverId || 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', name: rd.driverName || 'Driver Ojek Maleber', type: 'driver' })}
                                className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-amber-200 transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                              >
                                <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                                Rating Driver
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ACTIVITY DETAIL MODAL (LIVE TRACKING, RUTE HISTORI & RINCIAN PEMBAYARAN) */}
      {selectedActivityDetail && (
        <div
          className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 modal-overlay"
          onClick={() => setSelectedActivityDetail(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-zinc-200 dark:border-zinc-800 modal-content relative max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold text-lg">
                  {selectedActivityDetail.type === 'order' ? '🍔' : '🛵'}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">
                    Detail {selectedActivityDetail.type === 'order' ? 'Pesanan Makanan' : 'Perjalanan Ojek'}
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono">ID: #{selectedActivityDetail.data.id.slice(-8)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedActivityDetail(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold flex items-center justify-center cursor-pointer hover:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            {/* LIVE TRACKING MAP WITH ETA & DYNAMIC MULTI-STAGE ROUTING */}
            <div className="space-y-2">
              {(() => {
                const item = selectedActivityDetail.data;
                const isRide = selectedActivityDetail.type === 'ride';
                const isOrder = selectedActivityDetail.type === 'order';

                let pickupLoc = { lat: -6.8155, lng: 107.1865, address: 'Maleber' };
                let destLoc = { lat: -6.8155, lng: 107.1865, address: 'Maleber' };
                let trackingTitle = '🗺️ Live Tracking Peta & Estimasi Rute Jalan Maleber';
                let isFinished = item.status === 'completed' || item.status === 'cancelled';

                // Assigned Driver coords
                const drvName = isRide ? (item as RideRequest).driverName : (item as Order).driverName;
                const drvId = isRide ? (item as RideRequest).driverId : (item as Order).driverId;
                const assignedDrv = drivers.find((d) => d.id === drvId || d.name === drvName) || drivers.find((d) => d.isOnline) || drivers[0];
                const driverPos = assignedDrv ? { lat: assignedDrv.lat, lng: assignedDrv.lng } : { lat: -6.8155, lng: 107.1865 };

                if (isRide) {
                  const ride = item as RideRequest;
                  const pickupPos = { lat: ride.pickupLat, lng: ride.pickupLng, address: ride.pickupAddress };
                  const destPos = { lat: ride.destLat, lng: ride.destLng, address: ride.destAddress };

                  if (ride.status === 'accepted' || ride.status === 'arrived_pickup' || ride.status === 'requested') {
                    // PHASE 1: Driver -> Pickup Location
                    pickupLoc = { lat: driverPos.lat, lng: driverPos.lng, address: `Lokasi Driver (${assignedDrv?.name || 'Driver Maleber'})` };
                    destLoc = pickupPos;
                    trackingTitle = `Tahap 1: Driver (${assignedDrv?.name || 'Driver'}) Menuju Penjemputan Anda`;
                  } else if (ride.status === 'on_the_way') {
                    // PHASE 2: Pickup -> Destination
                    pickupLoc = pickupPos;
                    destLoc = destPos;
                    trackingTitle = `Tahap 2: Driver (${assignedDrv?.name || 'Driver'}) Mengantar Anda ke Alamat Tujuan`;
                  } else {
                    // Completed / Cancelled
                    pickupLoc = pickupPos;
                    destLoc = destPos;
                    trackingTitle = `Riwayat Perjalanan Ojek`;
                  }
                } else if (isOrder) {
                  const order = item as Order;
                  const storeObj = stores.find((s) => s.name === order.storeName || s.id === order.storeId);
                  const storePos = storeObj ? { lat: storeObj.lat, lng: storeObj.lng } : { lat: -6.8155, lng: 107.1865 };
                  const storeLoc = { lat: storePos.lat, lng: storePos.lng, address: order.storeName };
                  const customerLoc = { lat: order.lat || storePos.lat - 0.0055, lng: order.lng || storePos.lng + 0.0042, address: order.deliveryAddress };

                  if (order.status === 'pending' || order.status === 'cooking' || order.status === 'ready_for_pickup') {
                    // PHASE 1: Driver -> Store / Resto
                    pickupLoc = { lat: driverPos.lat, lng: driverPos.lng, address: `Lokasi Driver (${assignedDrv?.name || 'Driver Maleber'})` };
                    destLoc = storeLoc;
                    trackingTitle = `Tahap 1: Driver Menuju Toko (${order.storeName}) Ambil Pesanan`;
                  } else if (order.status === 'delivering') {
                    // PHASE 2: Store -> Customer Address
                    pickupLoc = storeLoc;
                    destLoc = customerLoc;
                    trackingTitle = `Tahap 2: Driver Mengantar Pesanan Makanan ke Alamat Anda`;
                  } else {
                    // Completed / Cancelled
                    pickupLoc = storeLoc;
                    destLoc = customerLoc;
                    trackingTitle = `Riwayat Pengiriman Makanan`;
                  }
                }

                return (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center flex-wrap gap-1">
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        {trackingTitle}
                      </span>
                      <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">
                        ● Real-time Live GPS
                      </span>
                    </div>

                    <div className="h-60 sm:h-72 rounded-2xl overflow-hidden shadow-inner">
                      <RouteMapComponent
                        pickupLocation={pickupLoc}
                        destLocation={destLoc}
                        activeDriver={drivers.find((d) => d.isOnline) || null}
                        isHistoricalView={isFinished}
                        className="w-full h-full rounded-none"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* RINCIAN PERJALANAN / RUTE */}
            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl space-y-3 text-xs border border-zinc-200/60 dark:border-zinc-700/60">
              <h4 className="font-extrabold text-xs text-zinc-900 dark:text-white uppercase tracking-wider">
                📍 Rincian Alamat &amp; Rute Perjalanan
              </h4>

              {selectedActivityDetail.type === 'order' ? (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="text-base">🏪</span>
                    <div>
                      <span className="text-[10px] font-extrabold text-zinc-500">Toko / Warung UMKM</span>
                      <p className="font-bold text-zinc-900 dark:text-white">{(selectedActivityDetail.data as Order).storeName}</p>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-zinc-200 dark:border-zinc-700 pt-2 flex items-start gap-2.5">
                    <span className="text-base">📍</span>
                    <div>
                      <span className="text-[10px] font-extrabold text-emerald-600">Alamat Pengiriman Tujuan</span>
                      <p className="font-bold text-zinc-900 dark:text-white">{(selectedActivityDetail.data as Order).deliveryAddress}</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="text-base">📍</span>
                    <div>
                      <span className="text-[10px] font-extrabold text-emerald-600 uppercase">Titik Penjemputan (A)</span>
                      <p className="font-bold text-zinc-900 dark:text-white">{(selectedActivityDetail.data as RideRequest).pickupAddress}</p>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-zinc-200 dark:border-zinc-700 pt-2 flex items-start gap-2.5">
                    <span className="text-base">🏁</span>
                    <div>
                      <span className="text-[10px] font-extrabold text-rose-600 uppercase">Titik Tujuan (B)</span>
                      <p className="font-bold text-zinc-900 dark:text-white">{(selectedActivityDetail.data as RideRequest).destAddress}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* RINCIAN ITEMS & PEMBAYARAN */}
            <div className="bg-emerald-50 dark:bg-emerald-950/50 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
              <h4 className="font-extrabold text-xs text-emerald-900 dark:text-emerald-200 uppercase tracking-wider mb-2">
                🧾 Rincian Pembayaran &amp; Struk Struk
              </h4>

              {selectedActivityDetail.type === 'order' && (
                <div className="space-y-1 pb-2 border-b border-emerald-200 dark:border-emerald-800">
                  {(selectedActivityDetail.data as Order).items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-zinc-700 dark:text-zinc-300">
                      <span>{it.quantity}x {it.productName}</span>
                      <span className="font-semibold tabular-nums">Rp {(it.price * it.quantity).toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between text-zinc-600 dark:text-zinc-400 pt-1">
                <span>{selectedActivityDetail.type === 'order' ? 'Subtotal Makanan' : 'Tarif Dasar Ojek'}</span>
                <span className="font-bold tabular-nums">
                  Rp {(selectedActivityDetail.type === 'order'
                    ? (selectedActivityDetail.data as Order).totalAmount - ((selectedActivityDetail.data as Order).deliveryFee || 5000)
                    : (selectedActivityDetail.data as RideRequest).fare
                  ).toLocaleString('id-ID')}
                </span>
              </div>

              {selectedActivityDetail.type === 'order' && (
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Ongkos Kirim Kurir</span>
                  <span className="font-bold tabular-nums">Rp {((selectedActivityDetail.data as Order).deliveryFee || 5000).toLocaleString('id-ID')}</span>
                </div>
              )}

              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Biaya Layanan Platform Desa</span>
                <span className="font-bold tabular-nums">Rp 1.000</span>
              </div>

              <div className="flex justify-between text-base font-black text-emerald-900 dark:text-emerald-200 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                <span>Total Biaya Keseluruhan</span>
                <span className="tabular-nums">
                  Rp {(selectedActivityDetail.type === 'order'
                    ? (selectedActivityDetail.data as Order).totalAmount + 1000
                    : (selectedActivityDetail.data as RideRequest).fare + 1000
                  ).toLocaleString('id-ID')}
                </span>
              </div>

              {/* Action Buttons inside Detail Modal (Chat for active orders, Rating for completed history) */}
              <div className="flex gap-2 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/60 flex-wrap">
                {selectedActivityDetail.data.status === 'completed' ? (
                  <>
                    {selectedActivityDetail.type === 'order' ? (
                      <>
                        <button
                          onClick={() => {
                            const ord = selectedActivityDetail.data as Order;
                            setRatingTarget({ id: ord.storeId, name: ord.storeName, type: 'store' });
                          }}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Star className="w-4 h-4 fill-current" />
                          Rating Resto
                        </button>
                        {Boolean((selectedActivityDetail.data as Order).driverId) && (
                          <button
                            onClick={() => {
                              const ord = selectedActivityDetail.data as Order;
                              setRatingTarget({ id: ord.driverId!, name: ord.driverName || 'Driver Maleber', type: 'driver' });
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Star className="w-4 h-4 fill-current" />
                            Rating Driver
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          const ride = selectedActivityDetail.data as RideRequest;
                          setRatingTarget({ id: ride.driverId || 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', name: ride.driverName || 'Driver Ojek Maleber', type: 'driver' });
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Star className="w-4 h-4 fill-current" />
                        Rating Driver Ojek
                      </button>
                    )}
                  </>
                ) : selectedActivityDetail.data.status !== 'cancelled' && onOpenChat && (
                  <>
                    {selectedActivityDetail.type === 'order' ? (
                      <>
                        <button
                          onClick={() => {
                            const ord = selectedActivityDetail.data as Order;
                            onOpenChat({ id: ord.storeId, name: ord.storeName, role: 'seller' }, { orderId: ord.id, contextTitle: `Penjual Toko (${ord.storeName})` });
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Chat Penjual Toko
                        </button>

                        {Boolean((selectedActivityDetail.data as Order).driverId) && (
                          <button
                            onClick={() => {
                              const ord = selectedActivityDetail.data as Order;
                              onOpenChat({ id: ord.driverId!, name: ord.driverName || 'Kang Dede (Driver Maleber)', role: 'driver' }, { orderId: ord.id, contextTitle: `Kurir Driver (${ord.driverName || 'Kang Dede'})` });
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Chat Kurir Driver
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          const ride = selectedActivityDetail.data as RideRequest;
                          onOpenChat({ id: ride.driverId || 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', name: ride.driverName || 'Kang Dede (Driver Maleber)', role: 'driver' }, { rideId: ride.id, contextTitle: `Driver Ojek (${ride.driverName || 'Kang Dede'})` });
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Chat Driver Ojek Maleber
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RATING MODAL */}
      {ratingTarget && (
        <RatingModal
          isOpen={true}
          targetId={ratingTarget.id}
          targetName={ratingTarget.name}
          targetType={ratingTarget.type}
          onClose={() => setRatingTarget(null)}
          onSubmitRating={onSubmitRating}
        />
      )}

      {/* CANCEL REASON MODAL */}
      {cancelTarget && (
        <CancelReasonModal
          isOpen={true}
          title={cancelTarget.title}
          onClose={() => setCancelTarget(null)}
          onConfirmCancel={(reason) => {
            if (cancelTarget.type === 'order' && onCancelOrder) {
              onCancelOrder(cancelTarget.id, reason);
            } else if (cancelTarget.type === 'ride' && onCancelRide) {
              onCancelRide(cancelTarget.id, reason);
            }
          }}
        />
      )}

      {/* ADD TO CART CONFIRMATION MODAL */}
      {confirmAddToCartProduct && (
        <AddToCartModal
          product={confirmAddToCartProduct}
          isOpen={true}
          onClose={() => setConfirmAddToCartProduct(null)}
          onConfirm={(product, qty, notes) => {
            onAddToCart(product, qty, notes);
          }}
        />
      )}

    </div>
  );
}
