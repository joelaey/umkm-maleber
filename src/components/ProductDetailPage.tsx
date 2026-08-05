'use client';

import React, { useState } from 'react';
import { Product, Store, UserRole, Review } from '@/types';
import RatingModal from './RatingModal';
import { ArrowLeft, ShoppingBag, Star, Heart, Tag, Award, Clock, Package, ChevronLeft, ChevronRight, Image as ImageIcon, Store as StoreIcon, ShieldCheck, Share2, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight, Phone, MapPin, MessageSquare, ThumbsUp } from 'lucide-react';

interface ProductDetailPageProps {
  product: Product;
  store?: Store;
  currentRole: UserRole;
  reviews?: Review[];
  onBack: () => void;
  onAddToCart: (product: Product, quantity: number, notes?: string) => void;
  onToggleAvailability?: (productId: string) => void;
  onSubmitRating?: (targetId: string, targetType: 'store' | 'driver' | 'product', rating: number, comment: string) => void;
  onOpenChat?: (
    targetUser: { id: string; name: string; role: UserRole; phone?: string; avatar?: string },
    options?: { orderId?: string; rideId?: string; contextTitle?: string }
  ) => void;
}

const SAMPLE_REVIEWS = [
  { id: 'rev-1', userName: 'Teh Rina Maleber', rating: 5, comment: 'Nasi liwetnya luar biasa enak, bumbunya meresap sampai ke dalam ayam kampungnya! Pengantaran cepat.', date: '2 jam yang lalu' },
  { id: 'rev-2', userName: 'Pak RT Maman', rating: 5, comment: 'Beras Pandanwangi asli wangi alami, cocok buat acara keluarga. Penjual ramah sekali.', date: 'Kemarin' },
  { id: 'rev-3', userName: 'Ibu Imas', rating: 5, comment: 'Porsi melimpah, sambal dadaknya pedas nampol khas Cianjur. Recomended!', date: '3 hari yang lalu' }
];

export default function ProductDetailPage({
  product,
  store,
  currentRole,
  reviews,
  onBack,
  onAddToCart,
  onToggleAvailability,
  onSubmitRating,
  onOpenChat
}: ProductDetailPageProps) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Gallery photo list (up to 10 photos)
  const photos = product.images && product.images.length > 0 ? product.images : [product.image];
  const activePhoto = photos[activePhotoIndex] || product.image;

  const handleAddToCartSubmit = () => {
    onAddToCart(product, quantity, notes);
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-fade-in">
      
      {/* Top Navigation Bar — PROPORTIONAL ON MOBILE */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-bold text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer shadow-sm group"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="hidden sm:inline">Kembali ke {currentRole === 'seller' ? 'Katalog Toko UMKM' : 'Katalog UMKM Maleber'}</span>
          <span className="sm:hidden">Kembali</span>
        </button>

        {currentRole !== 'seller' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRatingModal(true)}
              className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/40 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-extrabold cursor-pointer hover:bg-amber-200 transition-colors shadow-sm"
            >
              <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current text-amber-500" />
              <span className="hidden sm:inline">Beri Rating &amp; Komentar</span>
              <span className="sm:hidden">Beri Rating</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Left Gallery + Right Product Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 items-start">
        
        {/* LEFT COLUMN: MULTI-PHOTO GALLERY (LG:COL-SPAN-6) */}
        <div className="lg:col-span-6 space-y-3 sm:space-y-4">
          <div className="relative h-56 sm:h-80 lg:h-96 rounded-2xl sm:rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xl group">
            <img
              src={activePhoto}
              alt={product.name}
              className="w-full h-full object-cover transition-all duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80"></div>

            {/* Gallery Prev / Next Buttons */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button
                  onClick={() => setActivePhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </>
            )}

            {/* Top Left Badge */}
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-1.5 sm:gap-2">
              <span className="bg-emerald-600 text-white text-[10px] sm:text-xs font-black px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full shadow-lg">
                {product.category}
              </span>
              {photos.length > 1 && (
                <span className="glass-dark text-white text-[10px] sm:text-xs font-bold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full flex items-center gap-1">
                  <ImageIcon className="w-3 h-3 text-amber-400" /> {activePhotoIndex + 1}/{photos.length} Foto
                </span>
              )}
            </div>

            {/* Favorite Button */}
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2">
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full glass-dark text-white flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
                title="Favoritkan"
              >
                <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            </div>

            {/* Bottom Status Info */}
            <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 flex items-center justify-between gap-2">
              <span className="glass-dark text-white text-[9px] sm:text-xs font-semibold px-2.5 py-1 rounded-full truncate max-w-[140px] sm:max-w-none">
                100% Warga Maleber
              </span>
              {product.unit && (
                <span className="glass-dark text-white text-[9px] sm:text-xs font-bold px-2.5 py-1 rounded-full shrink-0">
                  Per {product.unit}
                </span>
              )}
            </div>
          </div>

          {/* Horizontal Thumbnail Bar */}
          {photos.length > 1 && (
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 scrollbar-none">
              {photos.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`relative shrink-0 w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                    activePhotoIndex === idx
                      ? 'border-emerald-500 scale-105 shadow-md ring-2 ring-emerald-500/30'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute top-0.5 left-0.5 bg-emerald-600 text-white text-[7px] font-black px-1 rounded">
                      UTAMA
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* REVIEWS & COMMENTS FEED — DYNAMIC REAL-TIME DATA FOR THIS PRODUCT */}
          {(() => {
            const productReviews = (reviews || []).filter(
              (r) => r.targetId === product.id && r.targetType === 'product'
            );
            const realProductAvg = productReviews.length > 0
              ? (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1)
              : (product.rating && product.rating > 0 ? product.rating.toFixed(1) : '0.0');

            return (
              <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5 sm:pb-3">
                  <h4 className="font-black text-xs sm:text-base text-zinc-900 dark:text-white flex items-center gap-1.5 sm:gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-500 shrink-0" /> Ulasan Warga Maleber
                  </h4>
                  <span className="text-[10px] sm:text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shrink-0">
                    ★ {realProductAvg} ({productReviews.length} Ulasan)
                  </span>
                </div>

                {productReviews.length === 0 ? (
                  <div className="text-center py-6 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700/60">
                    <Star className="w-8 h-8 text-amber-400/50 mx-auto mb-1" />
                    <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Belum ada ulasan untuk produk ini</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Jadilah yang pertama memberikan rating &amp; ulasan!</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 sm:space-y-3">
                    {productReviews.map((rev) => (
                      <div key={rev.id} className="bg-zinc-50 dark:bg-zinc-800/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200/60 dark:border-zinc-700/50 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-zinc-900 dark:text-white">{rev.userName}</span>
                          <span className="text-[9px] sm:text-[10px] text-zinc-400">
                            {new Date(rev.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {[...Array(rev.rating)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-current" />
                          ))}
                        </div>
                        <p className="text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-300 font-medium italic leading-relaxed">
                          &ldquo;{rev.comment}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* RIGHT COLUMN: PRODUCT DETAILS & PURCHASING CONTROLS (LG:COL-SPAN-6) */}
        <div className="lg:col-span-6 space-y-4 sm:space-y-6">
          
          {/* Title, Rating & Price Header */}
          <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3 sm:space-y-4">
            {(() => {
              const productReviews = (reviews || []).filter(
                (r) => r.targetId === product.id && r.targetType === 'product'
              );
              const realProductAvg = productReviews.length > 0
                ? (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1)
                : (product.rating && product.rating > 0 ? product.rating.toFixed(1) : '0.0');

              return (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full">
                    {product.category}
                  </span>
                  <div className="flex items-center gap-1 text-amber-500 font-extrabold text-xs sm:text-sm">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{realProductAvg}</span>
                    <span className="text-zinc-400 text-[10px] sm:text-xs font-normal">({productReviews.length} Ulasan)</span>
                  </div>
                </div>
              );
            })()}

            <h1 className="text-lg sm:text-3xl font-black text-zinc-900 dark:text-white leading-snug sm:leading-tight">
              {product.name}
            </h1>

            <div className="flex items-baseline gap-2 sm:gap-3 pt-1 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                Rp {product.price.toLocaleString('id-ID')}
              </span>
              {product.unit && (
                <span className="text-xs text-zinc-500 font-semibold">/ {product.unit}</span>
              )}
            </div>
          </div>

          {/* Store Info Profile */}
          {store && (
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <img src={store.image} alt={store.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl object-cover ring-2 ring-emerald-500/20 shrink-0" />
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <StoreIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    {store.name}
                  </h4>
                  <p className="text-[10px] sm:text-xs text-zinc-500 flex items-center gap-1 mt-0.5 line-clamp-1">
                    <MapPin className="w-3 h-3 text-zinc-400 shrink-0" /> {store.address}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {currentRole !== 'seller' && onOpenChat && (
                  <button
                    onClick={() => onOpenChat({ id: store.id, name: store.name, role: 'seller', phone: store.phone }, { contextTitle: `Diskusi Produk: ${product.name}` })}
                    className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 transition-colors text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Chat Toko
                  </button>
                )}
                {(() => {
                  const storeReviews = (reviews || []).filter((r) => r.targetId === store.id && r.targetType === 'store');
                  const realStoreAvg = storeReviews.length > 0
                    ? (storeReviews.reduce((sum, r) => sum + r.rating, 0) / storeReviews.length).toFixed(1)
                    : (store.rating && store.rating > 0 ? store.rating.toFixed(1) : '0.0');

                  return (
                    <div className="text-right">
                      <span className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full">
                        ★ {realStoreAvg} ({storeReviews.length})
                      </span>
                      <p className="text-[9px] sm:text-[10px] text-zinc-400 mt-0.5">Pemilik: {store.ownerName}</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Description & Ingredients */}
          <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3 sm:space-y-4">
            <h4 className="font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2.5 sm:pb-3">
              Deskripsi &amp; Informasi Produk
            </h4>

            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {product.description}
            </p>

            {product.ingredients && product.ingredients.length > 0 && (
              <div className="pt-2 space-y-2">
                <span className="text-[11px] sm:text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" /> Komposisi &amp; Racikan Alami:
                </span>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {product.ingredients.map((ing, idx) => (
                    <span
                      key={idx}
                      className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ACTION SECTION FOR BUYERS VS SELLERS */}
          {currentRole === 'seller' ? (
            /* SELLER MANAGEMENT CONTROLS */
            <div className="bg-amber-50 dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-amber-200 dark:border-zinc-800 shadow-sm space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-white">Kontrol Produk Penjual UMKM</h4>
                  <p className="text-[10px] sm:text-xs text-zinc-500">Atur ketersediaan stok produk ini di warung Anda</p>
                </div>
                {onToggleAvailability && (
                  <button
                    onClick={() => onToggleAvailability(product.id)}
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl text-xs font-black cursor-pointer shadow-sm transition-all ${
                      product.isAvailable
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-zinc-300 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}
                  >
                    Status: {product.isAvailable ? 'Tersedia ✅' : 'Stok Habis ❌'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* PEMBELI (BUYER) ORDER CONTROLS */
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 sm:space-y-5">
              
              {/* Order Notes */}
              <div className="space-y-1.5">
                <label className="text-[11px] sm:text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  ✍️ Catatan Pesanan Khusus (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Catatan (pisahkan sambal, pedas sedang...)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Quantity Counter & Submit Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pt-1">
                <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl sm:rounded-2xl p-1.5 w-full sm:w-auto justify-center">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-black flex items-center justify-center cursor-pointer shadow-sm hover:bg-zinc-50"
                  >
                    -
                  </button>
                  <span className="font-extrabold text-sm sm:text-base px-3 sm:px-4 text-zinc-900 dark:text-white tabular-nums">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-black flex items-center justify-center cursor-pointer shadow-sm hover:bg-zinc-50"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAddToCartSubmit}
                  disabled={addedSuccess}
                  className={`w-full sm:flex-1 font-black text-xs sm:text-sm py-3.5 sm:py-4 rounded-xl sm:rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer btn-ripple ${
                    addedSuccess
                      ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                  }`}
                >
                  {addedSuccess ? (
                    <>✓ Ditambahkan Ke Keranjang!</>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                      + Keranjang (Rp {(product.price * quantity).toLocaleString('id-ID')})
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* RATING MODAL FOR PRODUCT */}
      {showRatingModal && (
        <RatingModal
          isOpen={true}
          targetId={product.id}
          targetName={product.name}
          targetType="product"
          onClose={() => setShowRatingModal(false)}
          onSubmitRating={(id, type, rat, comm) => {
            if (onSubmitRating) onSubmitRating(id, type, rat, comm);
            setShowRatingModal(false);
          }}
        />
      )}

    </div>
  );
}
