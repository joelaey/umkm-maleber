'use client';

import React, { useState } from 'react';
import { Product, UserRole } from '@/types';
import { ShoppingBag, Star, Plus, Minus, Heart, Tag, Award, Clock, Package, ChevronLeft, ChevronRight, Image as ImageIcon, MessageSquare } from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, notes?: string) => void;
  currentRole?: UserRole;
  onOpenChat?: (
    targetUser: { id: string; name: string; role: UserRole; phone?: string; avatar?: string },
    options?: { orderId?: string; rideId?: string; contextTitle?: string }
  ) => void;
}

export default function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
  currentRole = 'buyer',
  onOpenChat
}: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  // Active gallery image index
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!product) return null;

  // Product photo list (fallback to product.image if product.images is empty)
  const photoList = product.images && product.images.length > 0 ? product.images : [product.image];
  const activePhoto = photoList[activeImageIndex] || product.image;

  const handleAdd = () => {
    onAddToCart(product, quantity, notes);
    setAddedToCart(true);
    setTimeout(() => {
      setAddedToCart(false);
      onClose();
      setQuantity(1);
      setNotes('');
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
      <div 
        className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 modal-content max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Product Image Gallery (Shopee Style) */}
        <div className="relative h-64 w-full bg-zinc-950 overflow-hidden group">
          <img
            src={activePhoto}
            alt={product.name}
            className="w-full h-full object-cover transition-all duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
          
          {/* Previous / Next photo navigation buttons */}
          {photoList.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : photoList.length - 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveImageIndex((prev) => (prev < photoList.length - 1 ? prev + 1 : 0))}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full glass-dark text-white font-bold flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors z-10"
          >
            ✕
          </button>
          
          {/* Favorite button */}
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="absolute top-4 left-4 w-9 h-9 rounded-full glass-dark text-white flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors z-10"
          >
            <Heart className={`w-4.5 h-4.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>

          {/* Photo Counter Badge */}
          {photoList.length > 1 && (
            <span className="absolute top-4 left-16 glass-dark text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <ImageIcon className="w-3 h-3 text-amber-400" /> {activeImageIndex + 1}/{photoList.length} Foto
            </span>
          )}
          
          {/* Category badge */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <span className="bg-emerald-600 text-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-lg">
              {product.category}
            </span>
            {product.rating && (
              <span className="bg-amber-500 text-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> {product.rating}
              </span>
            )}
          </div>

          {/* Unit badge */}
          {product.unit && (
            <span className="absolute bottom-4 right-4 glass-dark text-white text-[10px] font-bold px-3 py-1.5 rounded-full">
              Per {product.unit}
            </span>
          )}
        </div>

        {/* Thumbnail Carousel Bar (Shopee Style up to 10 photos) */}
        {photoList.length > 1 && (
          <div className="flex gap-2 p-3 bg-zinc-100 dark:bg-zinc-800/80 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 scrollbar-none">
            {photoList.map((imgUrl, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  activeImageIndex === idx
                    ? 'border-emerald-500 scale-105 shadow-md'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={imgUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          
          {/* Title & Price */}
          <div>
            <div className="flex justify-between items-start gap-3">
              <h3 className="text-xl font-black text-zinc-900 dark:text-white leading-tight">
                {product.name}
              </h3>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                Rp {product.price.toLocaleString('id-ID')}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-2.5 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Info Badges */}
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
              <Package className="w-3.5 h-3.5" /> Tersedia
            </span>
            <span className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
              <Award className="w-3.5 h-3.5" /> Produk Asli Maleber
            </span>
            <span className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-blue-200/60 dark:border-blue-800/40">
              <Clock className="w-3.5 h-3.5" /> Siap 10-15 menit
            </span>
          </div>

          {/* Ingredients / Composition */}
          {product.ingredients && product.ingredients.length > 0 && (
            <div className="space-y-2 bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/40">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-600" /> Komposisi &amp; Olahan:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {product.ingredients.map((ing, idx) => (
                  <span
                    key={idx}
                    className="bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700"
                  >
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Special Order Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              ✍️ Catatan Pesanan Khusus (Opsional):
            </label>
            <input
              type="text"
              placeholder="Contoh: pedas sedang, pisahkan sambal, ekstra kuah..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
            />
          </div>

          {/* Quantity Selector & Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-black flex items-center justify-center cursor-pointer shadow-sm hover:bg-zinc-50 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-extrabold text-sm px-3 text-zinc-900 dark:text-white tabular-nums min-w-[32px] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-black flex items-center justify-center cursor-pointer shadow-sm hover:bg-zinc-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {currentRole !== 'seller' && onOpenChat && (
                <button
                  onClick={() => onOpenChat({ id: product.storeId, name: 'Penjual Toko UMKM', role: 'seller' }, { contextTitle: `Tanya Produk: ${product.name}` })}
                  className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 transition-colors text-xs font-bold px-3.5 py-2.5 rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Chat Penjual Toko"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Chat Toko</span>
                </button>
              )}
            </div>

            <button
              onClick={handleAdd}
              disabled={addedToCart}
              className={`font-black text-xs px-6 py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer btn-ripple ${
                addedToCart
                  ? 'bg-emerald-400 text-emerald-950 shadow-emerald-400/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
              }`}
            >
              {addedToCart ? (
                <>✓ Ditambahkan!</>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  Tambah (Rp {(product.price * quantity).toLocaleString('id-ID')})
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
