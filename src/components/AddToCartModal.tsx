'use client';

import React, { useState } from 'react';
import { Product } from '@/types';
import { ShoppingBag, Plus, Minus, CheckCircle2, MessageSquare } from 'lucide-react';

interface AddToCartModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (product: Product, quantity: number, notes?: string, selectedVariants?: { groupName: string; optionName: string; extraPrice: number }[]) => void;
}

export default function AddToCartModal({
  product,
  isOpen,
  onClose,
  onConfirm
}: AddToCartModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<{ [groupId: string]: { optionId: string; optionName: string; extraPrice: number } }>({});

  if (!isOpen || !product) return null;

  const handleSelectOption = (groupId: string, optionId: string, optionName: string, extraPrice: number) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [groupId]: { optionId, optionName, extraPrice }
    }));
  };

  const handleConfirm = () => {
    // Check required variant groups
    if (product.variantGroups) {
      for (const group of product.variantGroups) {
        if (group.required && !selectedVariants[group.id]) {
          alert(`Silakan pilih opsi pada: "${group.name}" terlebih dahulu.`);
          return;
        }
      }
    }

    const formattedVariants = Object.entries(selectedVariants).map(([groupId, opt]) => {
      const group = product.variantGroups?.find((g) => g.id === groupId);
      return {
        groupName: group?.name || 'Varian',
        optionName: opt.optionName,
        extraPrice: opt.extraPrice
      };
    });

    onConfirm(product, quantity, notes, formattedVariants);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setQuantity(1);
      setNotes('');
      setSelectedVariants({});
      onClose();
    }, 800);
  };

  const totalExtraPrice = Object.values(selectedVariants).reduce((acc, curr) => acc + curr.extraPrice, 0);
  const unitPrice = product.price + totalExtraPrice;
  const totalPrice = unitPrice * quantity;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-zinc-200 dark:border-zinc-800 relative">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">Tambah ke Keranjang</h3>
              <span className="text-[10px] text-zinc-500 font-medium">Konfirmasi item pesanan Anda</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold flex items-center justify-center cursor-pointer hover:bg-zinc-200"
          >
            ✕
          </button>
        </div>

        {/* Product Card Overview */}
        <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60">
          <img
            src={product.image}
            alt={product.name}
            className="w-16 h-16 rounded-xl object-cover shrink-0 shadow-sm"
          />
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap gap-1">
              <span className="text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                {product.category}
              </span>
              {product.isPreOrder && (
                <span className="text-[9px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  📦 PO {product.preOrderDays || 1} Hari
                </span>
              )}
            </div>
            <h4 className="font-black text-xs sm:text-sm text-zinc-900 dark:text-white truncate">
              {product.name}
            </h4>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">
              Rp {unitPrice.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Pre-Order Banner if applicable */}
        {product.isPreOrder && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 px-3.5 py-2 rounded-2xl flex items-center gap-2 text-xs">
            <span className="text-base">📦</span>
            <div>
              <span className="font-extrabold block">Produk Pre-Order (PO)</span>
              <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                Estimasi pembuatan/dikirim {product.preOrderDays || 1} Hari setelah order dibuat
              </span>
            </div>
          </div>
        )}

        {/* Custom Variant & Add-on Selector (ShopeeFood Style) */}
        {product.variantGroups && product.variantGroups.length > 0 && (
          <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {product.variantGroups.map((g) => (
              <div key={g.id} className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-zinc-900 dark:text-white flex items-center gap-1.5">
                    {g.name}
                    {g.required && <span className="text-[10px] text-rose-500 font-bold">*Wajib</span>}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-semibold">Pilih 1</span>
                </div>
                <div className="space-y-1.5">
                  {g.options.map((opt) => {
                    const isSelected = selectedVariants[g.id]?.optionId === opt.id;
                    return (
                      <label
                        key={opt.id}
                        onClick={() => handleSelectOption(g.id, opt.id, opt.name, opt.extraPrice)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-bold shadow-sm'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`variant_${g.id}`}
                            checked={isSelected}
                            onChange={() => {}}
                            className="accent-emerald-600"
                          />
                          <span>{opt.name}</span>
                        </div>
                        <span className={`text-[11px] ${opt.extraPrice > 0 ? 'text-emerald-600 font-extrabold' : 'text-zinc-400'}`}>
                          {opt.extraPrice > 0 ? `+Rp ${opt.extraPrice.toLocaleString('id-ID')}` : '+Rp 0'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quantity Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
            Jumlah Pesanan:
          </label>
          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/80 p-2.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-700">
            <span className="text-xs font-medium text-zinc-500">Pilih kuantitas</span>
            <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold flex items-center justify-center hover:bg-zinc-200 cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-extrabold text-sm text-zinc-900 dark:text-white min-w-[20px] text-center tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-bold flex items-center justify-center hover:bg-emerald-200 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Custom Order Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            Catatan Khusus (Opsional):
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Sambal dipisah, ekstra pedas, dll..."
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-zinc-400"
          />
        </div>

        {/* Subtotal Calculation */}
        <div className="bg-emerald-50 dark:bg-emerald-950/60 p-3.5 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 flex justify-between items-center text-xs">
          <span className="font-bold text-zinc-700 dark:text-zinc-300">Total Harga:</span>
          <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm sm:text-base tabular-nums">
            Rp {totalPrice.toLocaleString('id-ID')}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-24 sm:w-28 py-3.5 text-xs font-extrabold rounded-2xl text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 transition-all cursor-pointer shrink-0"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`flex-1 py-3.5 px-4 text-xs font-black rounded-2xl text-white shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              isSuccess
                ? 'bg-emerald-700 shadow-emerald-700/40 scale-95'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 active:scale-95'
            }`}
          >
            {isSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300 animate-bounce shrink-0" />
                <span>Berhasil Ditambahkan!</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4 text-white shrink-0" />
                <span>+ Keranjang &bull; Rp {totalPrice.toLocaleString('id-ID')}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
