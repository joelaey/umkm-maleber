import React, { useState } from 'react';
import { CartItem, SavedAddress } from '@/types';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, MapPin, AlertCircle, CheckCircle2, Crosshair, Map as MapIcon, ArrowLeft } from 'lucide-react';
import { calculateOrderFees, formatRupiah } from '@/lib/feeCalculator';
import MapComponent from './MapComponent';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  savedAddresses?: SavedAddress[];
  onUpdateCartQty: (productId: string, delta: number) => void;
  onClearCart: () => void;
  onCheckout: (deliveryAddress: string, lat: number, lng: number, paymentMethod?: 'qris' | 'cod', paymentStatus?: 'paid' | 'unpaid' | 'cod') => void;
}

export default function CartModal({
  isOpen,
  onClose,
  cart,
  savedAddresses = [],
  onUpdateCartQty,
  onClearCart,
  onCheckout
}: CartModalProps) {
  const [address, setAddress] = useState(savedAddresses[0]?.name || '');
  const [coords, setCoords] = useState({ lat: -6.8155, lng: 107.1865 });
  const [showFullscreenMap, setShowFullscreenMap] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'cod'>('qris');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [pendingCoords, setPendingCoords] = useState({ lat: -6.8155, lng: 107.1865 });

  // Auto-detect GPS on open
  React.useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setCoords({ lat: latitude, lng: longitude });
          setPendingCoords({ lat: latitude, lng: longitude });
          // Auto-geocode for default address
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            const cleanAddr = formatCleanAddress(data, latitude, longitude);
            if (!address || address === savedAddresses[0]?.name) {
              setAddress(cleanAddr);
              setLocationConfirmed(true);
            }
          } catch {}
        },
        () => {},
        { timeout: 5000 }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatCleanAddress = (data: any, lat: number, lng: number) => {
    if (data && data.address) {
      const a = data.address;
      const parts = [
        a.road || a.pedestrian || a.suburb || a.village || a.neighbourhood,
        a.village || a.town || a.district || a.county
      ].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    }
    if (data && data.display_name) {
      return data.display_name.split(',').slice(0, 2).join(',').trim();
    }
    return `Lokasi Titik (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
  };

  const handleGetCurrentLocation = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      alert('Geolokasi tidak didukung oleh browser Anda.');
      return;
    }
    setIsLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPendingCoords({ lat, lng });
        setIsLocatingGPS(false);
      },
      (err) => {
        console.warn('GPS Error:', err);
        setIsLocatingGPS(false);
        alert('Gagal mendeteksi lokasi GPS. Silakan drop pin manual.');
      },
      { timeout: 8000 }
    );
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setPendingCoords({ lat, lng });
  };

  const handleConfirmLocation = async () => {
    setCoords(pendingCoords);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pendingCoords.lat}&lon=${pendingCoords.lng}`);
      const data = await res.json();
      setAddress(formatCleanAddress(data, pendingCoords.lat, pendingCoords.lng));
    } catch {
      setAddress(`Lokasi Pin (${pendingCoords.lat.toFixed(5)}, ${pendingCoords.lng.toFixed(5)})`);
    }
    setLocationConfirmed(true);
    setShowFullscreenMap(false);
  };

  const openMapPicker = () => {
    setPendingCoords({ ...coords });
    setShowFullscreenMap(true);
  };

  const rawSubtotal = cart.reduce((acc, curr) => acc + curr.product.price * curr.quantity, 0);
  const fees = calculateOrderFees(rawSubtotal);
  const { subtotal, deliveryFee, appFee, totalBuyer: total, sellerCommission, driverCommission } = fees;

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;

    // Strict Network & Internet Check before payment initialization
    if (typeof window !== 'undefined' && !navigator.onLine) {
      alert('⚠️ Koneksi Internet Terputus!\nPastikan koneksi internet HP/Browser Anda aktif sebelum melakukan pembayaran.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (paymentMethod === 'qris') {
        const { checkoutWithMidtrans } = await import('@/lib/midtrans');
        const customOrderId = `ORDER-${Date.now()}`;
        await checkoutWithMidtrans({
          orderId: customOrderId,
          grossAmount: total,
          customerName: 'Warga Maleber',
          items: [
            ...cart.map((c) => ({
              productId: c.product.id,
              productName: c.product.name,
              price: c.product.price,
              quantity: c.quantity
            })),
            {
              productId: 'fee-delivery',
              productName: 'Ongkir Kurir Desa',
              price: deliveryFee,
              quantity: 1
            },
            {
              productId: 'fee-app',
              productName: 'Biaya Jasa Aplikasi',
              price: appFee,
              quantity: 1
            }
          ],
          onSuccess: async (result: any) => {
            console.log('[Midtrans QRIS onSuccess]', result);
            try {
              const verifyRes = await fetch('/api/midtrans/verify-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: customOrderId })
              });
              const verifyData = await verifyRes.json();

              if (verifyData.success && verifyData.isPaid) {
                await onCheckout(address, coords.lat, coords.lng, 'qris', 'paid');
                setShowConfirm(false);
                onClose();
                return;
              }
            } catch (err) {
              console.error('Verify status API error:', err);
            }

            // Fallback status check from client result
            const status = result?.transaction_status;
            if (status === 'settlement' || status === 'capture') {
              await onCheckout(address, coords.lat, coords.lng, 'qris', 'paid');
              setShowConfirm(false);
              onClose();
            } else {
              alert('Pembayaran QRIS Belum Diselesaikan atau Dibatalkan. Pesanan makanan tidak diproses.');
              setIsSubmitting(false);
            }
          },
          onPending: async (result: any) => {
            console.log('[Midtrans QRIS onPending]', result);
            try {
              const verifyRes = await fetch('/api/midtrans/verify-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: customOrderId })
              });
              const verifyData = await verifyRes.json();
              if (verifyData.success && verifyData.isPaid) {
                await onCheckout(address, coords.lat, coords.lng, 'qris', 'paid');
                setShowConfirm(false);
                onClose();
                return;
              }
            } catch (err) {
              console.error('Verify status API error:', err);
            }

            alert('Pembayaran QRIS Anda belum diselesaikan (Status Pending/Batal). Pesanan makanan tidak diproses.');
            setIsSubmitting(false);
          },
          onError: (result: any) => {
            console.warn('[Midtrans QRIS onError]', result);
            alert('Pembayaran QRIS Gagal atau Dibatalkan. Pesanan tidak diproses.');
            setIsSubmitting(false);
          },
          onClose: () => {
            console.log('[Midtrans QRIS onClose]');
            alert('Pembayaran QRIS Dibatalkan. Pesanan tidak diproses.');
            setIsSubmitting(false);
          }
        });
      } else {
        await onCheckout(address, coords.lat, coords.lng, 'cod', 'cod');
        setShowConfirm(false);
        onClose();
      }
    } catch (e: any) {
      console.error('Checkout error:', e);
      alert(`⚠️ Terjadi kendala saat checkout: ${e.message || 'Koneksi error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // FULLSCREEN MAP PICKER OVERLAY
  // ═══════════════════════════════════════════════════════════════
  if (showFullscreenMap) {
    return (
      <div className="fixed inset-0 z-[99999] bg-black">
        {/* Fullscreen Map */}
        <div className="absolute inset-0">
          <MapComponent
            className="h-full w-full"
            center={pendingCoords}
            zoom={17}
            selectionMode="dest"
            destLocation={{ lat: pendingCoords.lat, lng: pendingCoords.lng, address: 'Titik Pengantaran' }}
            onSelectDest={handleMapClick}
          />
        </div>

        {/* Clean Top Floating Bar */}
        <div className="fixed top-3 left-3 right-3 z-[99999] flex items-center justify-between gap-2 max-w-lg mx-auto pointer-events-none">
          <button
            type="button"
            onClick={() => setShowFullscreenMap(false)}
            className="pointer-events-auto bg-zinc-900/90 backdrop-blur-md text-white h-9 px-3 rounded-full shadow-xl border border-white/15 flex items-center justify-center gap-1.5 hover:bg-black transition-all text-xs font-bold shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
            <span className="hidden sm:inline">Kembali</span>
          </button>

          <div className="bg-zinc-900/90 backdrop-blur-md px-4 py-1.5 rounded-full shadow-xl border border-emerald-500/40 text-center pointer-events-auto truncate max-w-[200px] sm:max-w-xs">
            <p className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
              Titik Pengantaran
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
              <span className="truncate">{address || 'Lokasi Terpilih di Peta'}</span>
            </div>
            <button
              type="button"
              onClick={handleConfirmLocation}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm py-3 px-5 rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all w-full cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Konfirmasi Titik Pengantaran
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN CART MODAL (Form View)
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-t-[28px] sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl border border-zinc-200 dark:border-zinc-800 relative max-h-[92vh] overflow-y-auto">
        
        {/* Drag Handle */}
        <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto sm:hidden"></div>

        <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-zinc-900 dark:text-white">Keranjang Belanja</h3>
          </div>
          <button
            onClick={() => { setShowConfirm(false); onClose(); }}
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <ShoppingBag className="w-12 h-12 text-zinc-300 mx-auto" />
            <p className="font-semibold text-zinc-600 text-sm">Keranjang masih kosong</p>
            <p className="text-xs text-zinc-400">Pilih makanan atau produk UMKM dari katalog Desa Maleber</p>
          </div>
        ) : showConfirm ? (
          /* ── CONFIRMATION SCREEN ── */
          <div className="py-2 space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto shadow-md text-xl">
                🍲
              </div>
              <h4 className="text-lg font-black text-zinc-900 dark:text-white">Konfirmasi Pemesanan Kuliner</h4>
              <p className="text-xs text-zinc-500">Periksa kembali rincian pesanan Anda sebelum dikirim</p>
            </div>

            {/* Address & Store Info */}
            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3.5 rounded-2xl text-xs space-y-2 border border-zinc-200/60 dark:border-zinc-700/60">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-extrabold text-emerald-600 uppercase">Alamat Tujuan Pengantaran</span>
                  <p className="font-bold text-zinc-900 dark:text-white mt-0.5">{address}</p>
                </div>
              </div>
            </div>

            {/* Itemized Products Breakdown */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              <span className="text-[11px] font-bold text-zinc-500">Rincian Item ({cart.reduce((a, c) => a + c.quantity, 0)} produk):</span>
              {cart.map((item) => (
                <div key={item.product.id} className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-600">{item.quantity}x</span>
                    <span className="font-bold text-zinc-900 dark:text-white line-clamp-1">{item.product.name}</span>
                  </div>
                  <span className="font-extrabold text-zinc-700 dark:text-zinc-300 tabular-nums">
                    Rp {(item.product.price * item.quantity).toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-900 dark:text-white flex items-center gap-1.5">
                💳 Pilih Metode Pembayaran:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('qris')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    paymentMethod === 'qris'
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-zinc-900 dark:text-white flex items-center gap-1">
                      📱 QRIS Midtrans
                    </span>
                    {paymentMethod === 'qris' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-tight">
                    Scan via GoPay, ShopeePay, Dana, OVO, &amp; Banking
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    paymentMethod === 'cod'
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-zinc-900 dark:text-white flex items-center gap-1">
                      💵 Bayar COD (Tunai)
                    </span>
                    {paymentMethod === 'cod' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-tight">
                    Bayar uang pas ke kurir saat barang sampai
                  </p>
                </button>
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="bg-emerald-50 dark:bg-emerald-950/50 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Subtotal Makanan</span>
                <span className="font-bold tabular-nums">Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Ongkir Kurir Desa</span>
                <span className="font-bold tabular-nums">Rp {deliveryFee.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Biaya Jasa Aplikasi &amp; Operasional</span>
                <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-300">Rp {appFee.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Metode Pembayaran</span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
                  {paymentMethod === 'qris' ? '📱 QRIS Instant Midtrans' : '💵 Bayar Tunai (COD)'}
                </span>
              </div>
              <div className="flex justify-between text-base font-black text-emerald-800 dark:text-emerald-300 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                <span>Total Biaya</span>
                <span className="tabular-nums">Rp {total.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Confirmation Buttons */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isSubmitting}
                className="flex-1 py-3 text-xs font-bold rounded-2xl text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 cursor-pointer"
              >
                Cek Kembali
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 text-xs font-black rounded-2xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? 'Memproses...' : paymentMethod === 'qris' ? 'Bayar & Pesan via QRIS' : 'Ya, Kirim Pesanan (COD)'}
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* ── MAIN CART FORM ── */
          <div className="space-y-4">
            
            {/* Cart Items List */}
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div>
                      <h5 className="font-bold text-xs text-zinc-900 dark:text-white">
                        {item.product.name}
                      </h5>
                      <span className="text-xs text-emerald-700 font-extrabold">
                        Rp {item.product.price.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 rounded-xl px-2 py-1 border border-zinc-200 dark:border-zinc-700">
                    <button
                      onClick={() => onUpdateCartQty(item.product.id, -1)}
                      className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-bold text-xs px-1">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateCartQty(item.product.id, 1)}
                      className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ── DELIVERY LOCATION SECTION ── */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-black text-zinc-900 dark:text-white flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Lokasi Pengantaran
              </label>

              {/* Location Status Card */}
              {locationConfirmed ? (
                <div className="space-y-2">
                  {/* Confirmed Address Card */}
                  <div className="bg-emerald-50 dark:bg-emerald-950/50 p-3 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/50 flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-extrabold text-emerald-600 uppercase">Lokasi Terpilih</p>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{address}</p>
                    </div>
                    <button
                      type="button"
                      onClick={openMapPicker}
                      className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer shrink-0"
                    >
                      Ubah
                    </button>
                  </div>

                  {/* Mini Map Preview */}
                  <div className="h-28 rounded-2xl overflow-hidden border border-emerald-200/50 dark:border-emerald-800/40 shadow-inner">
                    <MapComponent
                      key={`mini-${coords.lat.toFixed(5)}-${coords.lng.toFixed(5)}`}
                      className="h-full w-full rounded-none"
                      center={coords}
                      zoom={16}
                      forceStreetMode={true}
                      destLocation={{ lat: coords.lat, lng: coords.lng, address }}
                    />
                  </div>

                  {/* Manual Address Detail */}
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Tambahkan detail: RT/RW, warna pagar, patokan..."
                    rows={2}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              ) : (
                /* Not Yet Confirmed — Big "Pick Location" Button */
                <button
                  type="button"
                  onClick={openMapPicker}
                  className="w-full p-4 rounded-2xl border-2 border-dashed border-emerald-400 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-50 transition-all cursor-pointer flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">📌 Pilih Titik di Peta</p>
                    <p className="text-[11px] text-zinc-500">Buka peta fullscreen untuk drop pin lokasi pengantaran Anda</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-emerald-600 ml-auto shrink-0" />
                </button>
              )}

              {/* Saved Address Quick Pills */}
              {savedAddresses.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[10px] font-extrabold text-zinc-400 shrink-0">Favorit:</span>
                  {savedAddresses.map((sa) => (
                    <button
                      type="button"
                      key={sa.id}
                      onClick={() => {
                        setAddress(`${sa.label}: ${sa.name}`);
                        setCoords({ lat: sa.lat, lng: sa.lng });
                        setLocationConfirmed(true);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all shrink-0 cursor-pointer ${
                        address.includes(sa.name)
                          ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                      }`}
                    >
                      {sa.label === 'Rumah' ? '🏠' : sa.label === 'Kantor' ? '🏢' : sa.label === 'Sekolah' ? '🏫' : '📍'} {sa.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Summary Price */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Subtotal Produk</span>
                <span className="font-bold">Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Ongkir Kurir Desa</span>
                <span className="font-bold">Rp {deliveryFee.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Biaya Jasa Aplikasi &amp; Operasional</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">Rp {appFee.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-emerald-800 dark:text-emerald-300 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                <span>Total Pembayaran</span>
                <span>Rp {total.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!locationConfirmed}
              className={`w-full font-black py-3.5 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                locationConfirmed
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                  : 'bg-zinc-300 dark:bg-zinc-700 text-zinc-500 cursor-not-allowed shadow-none'
              }`}
            >
              {locationConfirmed ? 'Lanjut Konfirmasi Pemesanan' : 'Pilih Lokasi Pengantaran Dulu'}
              <ArrowRight className="w-4 h-4" />
            </button>

          </div>
        )}

      </div>
    </div>
  );
}
