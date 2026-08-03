'use client';

import React, { useState, useCallback } from 'react';
import { Store, Product, DriverInfo, Order, RideRequest, UserRole, SavedAddress, PlacePOI } from '@/types';
import MapComponent from './MapComponent';
import { MALEBER_CENTER, INITIAL_PLACES } from '@/lib/mockData';
import { calculateRoadDistance, calculateOjekFare, formatDistanceText, getOSRMRoute } from '@/lib/geoUtils';
import { ShoppingBag, Bike, Star, Clock, MapPin, Search, ArrowRight, ShieldCheck, CheckCircle2, ChevronRight, XCircle, AlertCircle, MessageSquare, Crosshair } from 'lucide-react';
import RatingModal from './RatingModal';
import CancelReasonModal from './CancelReasonModal';

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
    fare: number
  ) => void;
  onSubmitRating: (targetId: string, targetType: 'store' | 'driver' | 'product', rating: number, comment: string) => void;
  onSelectProductDetail?: (product: Product) => void;
  onCancelOrder?: (orderId: string, reason?: string) => void;
  onCancelRide?: (rideId: string, reason?: string) => void;
  onOpenChat?: (
    targetUser: { id: string; name: string; role: UserRole; phone?: string; avatar?: string },
    options?: { orderId?: string; rideId?: string; contextTitle?: string }
  ) => void;
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
  onOpenChat
}: BuyerModeProps) {
  const [activeSubTab, setActiveSubTab] = useState<'marketplace' | 'ojek' | 'history'>('marketplace');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('semua');

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
  const [ratingTarget, setRatingTarget] = useState<{ id: string; name: string; type: 'store' | 'driver' | 'product' } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; type: 'order' | 'ride'; title: string } | null>(null);

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
  React.useEffect(() => {
    let isCancelled = false;
    getOSRMRoute(pickupSpot.lat, pickupSpot.lng, destSpot.lat, destSpot.lng).then((res) => {
      if (!isCancelled) {
        setCalcDistance(res.distanceKm);
        setCalcFare(res.fare);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [pickupSpot.lat, pickupSpot.lng, destSpot.lat, destSpot.lng]);

  const handleFinalRideSubmit = async () => {
    if (isSubmittingRide) return;
    setIsSubmittingRide(true);
    try {
      await onCreateRide(
        pickupSpot.name,
        pickupSpot.lat,
        pickupSpot.lng,
        destSpot.name,
        destSpot.lat,
        destSpot.lng,
        calcDistance,
        calcFare
      );
      setShowRideConfirm(false);
      setActiveSubTab('history');
    } finally {
      setIsSubmittingRide(false);
    }
  };

  // Filter products by category & search query
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'semua' || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
          className={`pb-2.5 sm:pb-3.5 px-3.5 sm:px-6 font-extrabold text-xs sm:text-sm border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'history'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Riwayat ({orders.length + rides.length})
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
                      onClick={() => onAddToCart(product)}
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
      {activeSubTab === 'ojek' && (
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
                Pilih lokasi jemput &amp; tujuan via Peta (Drop Pin), GPS, atau Alamat Favorit
              </p>
            </div>
            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold px-3 py-1 rounded-full self-start sm:self-center">
              ● {drivers.filter((d) => d.isOnline).length} Driver Online
            </span>
          </div>

          {/* Location Controls (Pickup & Destination) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Pickup Location Control */}
            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200/80 dark:border-zinc-700/60 space-y-2">
              <div className="flex justify-between items-center flex-wrap gap-1.5">
                <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  📍 Titik Penjemputan:
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={isLocatingGPS}
                    className="text-[10px] sm:text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                    title="Ambil Lokasi GPS Saya Saat Ini"
                  >
                    <Crosshair className={`w-3.5 h-3.5 ${isLocatingGPS ? 'animate-spin' : ''}`} />
                    {isLocatingGPS ? 'GPS...' : '🎯 Lokasi Saat Ini'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapSelectionMode(mapSelectionMode === 'pickup' ? null : 'pickup')}
                    className={`text-[10px] sm:text-[11px] font-extrabold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      mapSelectionMode === 'pickup'
                        ? 'bg-emerald-600 text-white animate-pulse shadow-md'
                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                    }`}
                  >
                    {mapSelectionMode === 'pickup' ? '📍 Tandai di Peta...' : '📌 Drop Pin di Peta'}
                  </button>
                </div>
              </div>

              {/* Saved Address Pills for Pickup */}
              {savedAddresses.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {savedAddresses.map((sa) => (
                    <button
                      type="button"
                      key={sa.id}
                      onClick={() => {
                        setPickupSpot({ name: `${sa.label}: ${sa.name}`, lat: sa.lat, lng: sa.lng });
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all shrink-0 cursor-pointer ${
                        pickupSpot.name.includes(sa.name)
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {sa.label === 'Rumah' ? '🏠' : sa.label === 'Kantor' ? '🏢' : sa.label === 'Sekolah' ? '🏫' : '📍'} {sa.label}
                    </button>
                  ))}
                </div>
              )}

              {isManualLocation ? (
                <input
                  type="text"
                  value={pickupSpot.name}
                  onChange={(e) => {
                    setPickupSpot({ ...pickupSpot, name: e.target.value });
                  }}
                  placeholder="Alamat / patokan penjemputan..."
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              ) : (
                <select
                  value={pickupSpot.name}
                  onChange={(e) => {
                    const spot = MALEBER_SPOTS.find((s) => s.name === e.target.value) || MALEBER_SPOTS[0];
                    setPickupSpot(spot);
                  }}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {MALEBER_SPOTS.map((s, idx) => (
                    <option key={idx} value={s.name}>{s.name}</option>
                  ))}
                </select>
              )}

              {/* Geocoded Address Preview for Pickup */}
              {pickupGeoAddress && (
                <div className="flex items-start gap-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/60 rounded-xl px-3 py-2">
                  <span className="text-emerald-500 mt-0.5 shrink-0">📍</span>
                  <div>
                    <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 block leading-none mb-0.5">Alamat Terdeteksi:</span>
                    <span className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-100 leading-tight">{pickupGeoAddress}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Destination Location Control */}
            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200/80 dark:border-zinc-700/60 space-y-2">
              <div className="flex justify-between items-center flex-wrap gap-1.5">
                <label className="text-xs font-bold text-rose-500 dark:text-rose-400 flex items-center gap-1">
                  🏁 Lokasi Tujuan:
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleGetCurrentLocationDest}
                    disabled={isLocatingGPSDest}
                    className="text-[10px] sm:text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                    title="Gunakan Lokasi Saat Ini sebagai Tujuan"
                  >
                    <Crosshair className={`w-3.5 h-3.5 ${isLocatingGPSDest ? 'animate-spin' : ''}`} />
                    {isLocatingGPSDest ? 'GPS...' : '🎯 Lokasi Saat Ini'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapSelectionMode(mapSelectionMode === 'dest' ? null : 'dest')}
                    className={`text-[10px] sm:text-[11px] font-extrabold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      mapSelectionMode === 'dest'
                        ? 'bg-rose-600 text-white animate-pulse shadow-md'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-200'
                    }`}
                  >
                    {mapSelectionMode === 'dest' ? '🏁 Tandai di Peta...' : '📌 Drop Pin di Peta'}
                  </button>
                </div>
              </div>

              {/* Saved Address Pills for Destination */}
              {savedAddresses.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {savedAddresses.map((sa) => (
                    <button
                      type="button"
                      key={sa.id}
                      onClick={() => {
                        setDestSpot({ name: `${sa.label}: ${sa.name}`, lat: sa.lat, lng: sa.lng });
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all shrink-0 cursor-pointer ${
                        destSpot.name.includes(sa.name)
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {sa.label === 'Rumah' ? '🏠' : sa.label === 'Kantor' ? '🏢' : sa.label === 'Sekolah' ? '🏫' : '📍'} {sa.label}
                    </button>
                  ))}
                </div>
              )}

              {isManualLocation ? (
                <input
                  type="text"
                  value={destSpot.name}
                  onChange={(e) => {
                    setDestSpot({ ...destSpot, name: e.target.value });
                  }}
                  placeholder="Alamat / patokan tujuan..."
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              ) : (
                <select
                  value={destSpot.name}
                  onChange={(e) => {
                    const spot = MALEBER_SPOTS.find((s) => s.name === e.target.value) || MALEBER_SPOTS[1];
                    setDestSpot(spot);
                  }}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {MALEBER_SPOTS.map((s, idx) => (
                    <option key={idx} value={s.name}>{s.name}</option>
                  ))}
                </select>
              )}

              {/* Geocoded Address Preview for Destination */}
              {destGeoAddress && (
                <div className="flex items-start gap-1.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200/70 dark:border-rose-800/60 rounded-xl px-3 py-2">
                  <span className="text-rose-500 mt-0.5 shrink-0">🏁</span>
                  <div>
                    <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-300 block leading-none mb-0.5">Alamat Terdeteksi:</span>
                    <span className="text-[11px] font-semibold text-rose-900 dark:text-rose-100 leading-tight">{destGeoAddress}</span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Mode Toggle */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsManualLocation(!isManualLocation)}
              className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              {isManualLocation ? 'Gunakan Preset Lokasi Maleber' : 'Ketik Alamat Manual'}
            </button>
          </div>

          {/* PETA LIVE INTERACTIVE (DI ATAS ESTIMASI & TOMBOL ORDER) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                🗺️ Peta Live Interactive &amp; Rute Jalan Maleber
              </h4>
              <span className="text-[11px] text-zinc-500">Klik di peta untuk tandai lokasi</span>
            </div>

            <div className="h-64 sm:h-80 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner">
              <MapComponent
                center={{ lat: MALEBER_CENTER.lat, lng: MALEBER_CENTER.lng }}
                zoom={15}
                stores={[]}
                drivers={drivers}
                places={places}
                pickupLocation={{ lat: pickupSpot.lat, lng: pickupSpot.lng, address: pickupSpot.name }}
                destLocation={{ lat: destSpot.lat, lng: destSpot.lng, address: destSpot.name }}
                selectionMode={mapSelectionMode}
                onSelectPickup={async (lat, lng) => {
                  const geoAddr = await reverseGeocode(lat, lng);
                  setPickupSpot({
                    name: geoAddr ? `📍 ${geoAddr}` : `📍 Pin Jemput (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                    lat,
                    lng
                  });
                  setPickupGeoAddress(geoAddr);
                  setMapSelectionMode(null);
                }}
                onSelectDest={async (lat, lng) => {
                  const geoAddr = await reverseGeocode(lat, lng);
                  setDestSpot({
                    name: geoAddr ? `🏁 ${geoAddr}` : `🏁 Pin Tujuan (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                    lat,
                    lng
                  });
                  setDestGeoAddress(geoAddr);
                  setMapSelectionMode(null);
                }}
              />
            </div>
          </div>

          {/* Fare & Distance Calculation Banner */}
          <div className="bg-emerald-50 dark:bg-emerald-950/60 p-4 sm:p-5 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 space-y-2">
            <div className="flex justify-between items-center text-xs text-zinc-600 dark:text-zinc-400 font-semibold">
              <span>Estimasi Jarak Tempuh Rute Jalan:</span>
              <span className="font-bold text-zinc-900 dark:text-white tabular-nums">{calcDistance} km</span>
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

                {/* Price Breakdown */}
                <div className="bg-emerald-50 dark:bg-emerald-950/50 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Estimasi Jarak Tempuh</span>
                    <span className="font-bold tabular-nums">{calcDistance} km</span>
                  </div>
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Metode Pembayaran</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">💵 Tunai / COD</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-emerald-800 dark:text-emerald-300 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                    <span>Total Tarif Ojek</span>
                    <span className="tabular-nums">Rp {calcFare.toLocaleString('id-ID')}</span>
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
      )}

      {/* SUB TAB 3: ORDER HISTORY & LIVE TRACKING WITH CANCEL ORDER & ACCURATE RATING BUTTONS */}
      {activeSubTab === 'history' && (
        <div className="space-y-6">
          <h3 className="font-black text-xl text-zinc-900 dark:text-white">Riwayat Transaksi &amp; Live Tracking</h3>

          {orders.length === 0 && rides.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <Clock className="w-12 h-12 text-zinc-300 mx-auto" />
              <p className="font-bold text-zinc-700 dark:text-zinc-300">Belum ada transaksi</p>
              <p className="text-xs text-zinc-400">Pesan makanan atau ojek untuk melihat riwayat perjalanan Anda</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Food Orders History — Latest Order First */}
              {[...orders]
                .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                .map((ord) => {
                const isCancelled = ord.status === 'cancelled';
                const isCompleted = ord.status === 'completed';
                return (
                  <div key={ord.id} className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                          🍔 Pesanan Makanan
                        </span>
                        <h4 className="font-extrabold text-base text-zinc-900 dark:text-white mt-1">
                          {ord.storeName}
                        </h4>
                        <p className="text-xs text-zinc-500">Tujuan: {ord.deliveryAddress}</p>
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                        isCancelled
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : isCompleted
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
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

                    <div className="flex items-center justify-between pt-1 gap-2 flex-wrap border-t border-zinc-100 dark:border-zinc-800 pt-3">
                      {isCancelled ? (
                        <div className="text-xs text-rose-600 dark:text-rose-400 font-bold space-y-0.5">
                          <p className="font-bold">Pesanan Dibatalkan</p>
                          {ord.cancelReason && (
                            <p className="text-[11px] text-zinc-500 font-medium">Alasan: {ord.cancelReason}</p>
                          )}
                        </div>
                      ) : ord.driverName ? (
                        <p className="text-xs text-emerald-600 font-bold">Driver: {ord.driverName}</p>
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-medium">Mencari driver...</span>
                      )}

                      <div className="flex gap-1.5 flex-wrap">
                        {/* CHAT PENJUAL (Hanya Tampil Saat Pesanan Aktif) */}
                        {!isCancelled && !isCompleted && onOpenChat && (
                          <button
                            onClick={() => onOpenChat({ id: ord.storeId, name: ord.storeName, role: 'seller' }, { orderId: ord.id, contextTitle: `Pesanan Makanan (${ord.storeName})` })}
                            className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Chat Penjual
                          </button>
                        )}

                        {/* CHAT DRIVER (Hanya Tampil Saat Pesanan Aktif) */}
                        {!isCancelled && !isCompleted && ord.driverName && onOpenChat && (
                          <button
                            onClick={() => onOpenChat({ id: ord.driverId || 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', name: ord.driverName!, role: 'driver' }, { orderId: ord.id, contextTitle: `Kurir Pengantar Makanan` })}
                            className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-blue-200 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Chat Driver
                          </button>
                        )}

                        {/* Cancel Button for Active Orders */}
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
                          <button
                            onClick={() => setRatingTarget({ id: ord.storeId, name: ord.storeName, type: 'store' })}
                            className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-amber-200 transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                          >
                            <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                            Beri Rating
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Ride Requests History — Latest Order First */}
              {[...rides]
                .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                .map((rd) => {
                const isCancelled = rd.status === 'cancelled';
                const isCompleted = rd.status === 'completed';
                return (
                  <div key={rd.id} className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full">
                          Ojek Online Maleber
                        </span>
                        <h4 className="font-extrabold text-base text-zinc-900 dark:text-white mt-1">
                          {rd.pickupAddress} &rarr; {rd.destAddress}
                        </h4>
                        <p className="text-xs text-zinc-500">Jarak: {rd.distanceKm} km</p>
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                        isCancelled
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : isCompleted
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                      }`}>
                        {isCancelled ? 'DIBATALKAN' : isCompleted ? 'SELESAI' : 'PROSES'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-2xl text-xs font-black text-emerald-600">
                      <span>Tarif Ojek:</span>
                      <span>Rp {rd.fare.toLocaleString('id-ID')}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 gap-2 flex-wrap border-t border-zinc-100 dark:border-zinc-800 pt-3">
                      {isCancelled ? (
                        <div className="text-xs text-rose-600 dark:text-rose-400 font-bold space-y-0.5">
                          <p className="font-bold">Perjalanan Dibatalkan</p>
                          {rd.cancelReason && (
                            <p className="text-[11px] text-zinc-500 font-medium">Alasan: {rd.cancelReason}</p>
                          )}
                        </div>
                      ) : rd.driverName ? (
                        <p className="text-xs text-emerald-600 font-bold">Driver: {rd.driverName}</p>
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-medium">Mencari driver...</span>
                      )}

                      <div className="flex gap-1.5 flex-wrap">
                        {/* CHAT DRIVER OJEK (Hanya Tampil Saat Perjalanan Aktif) */}
                        {!isCancelled && !isCompleted && rd.driverName && onOpenChat && (
                          <button
                            onClick={() => onOpenChat({ id: rd.driverId || 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', name: rd.driverName!, role: 'driver' }, { rideId: rd.id, contextTitle: `Driver Ojek Maleber` })}
                            className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-blue-200 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Chat Driver
                          </button>
                        )}

                        {/* Cancel Button for Active Rides */}
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
                            Beri Rating
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

    </div>
  );
}
