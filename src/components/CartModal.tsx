'use client';

import React, { useState } from 'react';
import { CartItem, SavedAddress } from '@/types';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  savedAddresses?: SavedAddress[];
  onUpdateCartQty: (productId: string, delta: number) => void;
  onClearCart: () => void;
  onCheckout: (deliveryAddress: string, lat: number, lng: number) => void;
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
  const [address, setAddress] = useState(savedAddresses[0]?.name || 'Jl. Raya Maleber No. 15, RT 03/RW 01');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const subtotal = cart.reduce((acc, curr) => acc + curr.product.price * curr.quantity, 0);
  const deliveryFee = subtotal > 0 ? 5000 : 0;
  const total = subtotal + deliveryFee;

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCheckout(address, -6.8155, 107.1865);
      setShowConfirm(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 relative max-h-[92vh] overflow-y-auto">
        
        <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black text-zinc-900 dark:text-white">Keranjang Belanja</h3>
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
          /* DOUBLE ORDER PREVENTION CONFIRMATION SCREEN */
          <div className="py-6 space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mx-auto shadow-md">
              <AlertCircle className="w-7 h-7" />
            </div>
            
            <div className="space-y-1">
              <h4 className="text-lg font-black text-zinc-900 dark:text-white">Konfirmasi Pemesanan Makanan</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Apakah Anda yakin ingin memproses pesanan ini dengan total biaya <span className="font-extrabold text-emerald-600">Rp {total.toLocaleString('id-ID')}</span>?
              </p>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3.5 rounded-2xl text-xs space-y-1 text-left">
              <p className="font-bold text-zinc-700 dark:text-zinc-300">Tujuan: {address}</p>
              <p className="text-zinc-500">Jumlah item: {cart.reduce((a, c) => a + c.quantity, 0)} produk</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isSubmitting}
                className="flex-1 py-3 text-xs font-bold rounded-2xl text-zinc-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 cursor-pointer"
              >
                Cek Kembali
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 text-xs font-black rounded-2xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? 'Memproses...' : 'Ya, Kirim Pesanan'}
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Cart Items List */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
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

            {/* Delivery Address Field */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Alamat Pengantaran (Wilayah Maleber):
                </label>
              </div>

              {/* Saved Address Quick Selector Pills */}
              {savedAddresses.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {savedAddresses.map((sa) => (
                    <button
                      type="button"
                      key={sa.id}
                      onClick={() => setAddress(sa.name)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all shrink-0 cursor-pointer ${
                        address === sa.name
                          ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                      }`}
                    >
                      {sa.label === 'Rumah' ? '🏠' : sa.label === 'Kantor' ? '🏢' : sa.label === 'Sekolah' ? '🏫' : '📍'} {sa.label}
                    </button>
                  ))}
                </div>
              )}

              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Dusun/RT/RW atau patokan rumah..."
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
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
              <div className="flex justify-between text-sm font-black text-emerald-800 dark:text-emerald-300 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                <span>Total Pembayaran</span>
                <span>Rp {total.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Checkout Action Triggering Confirmation */}
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              Lanjut Konfirmasi Pemesanan
              <ArrowRight className="w-4 h-4" />
            </button>

          </div>
        )}

      </div>
    </div>
  );
}
