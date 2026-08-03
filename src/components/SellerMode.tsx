'use client';

import React, { useState } from 'react';
import { Store, Product, Order, Review, UserRole } from '@/types';
import { Store as StoreIcon, Package, DollarSign, Clock, Plus, CheckCircle, AlertCircle, ToggleLeft, ToggleRight, Edit, Trash2, Image as ImageIcon, Star, Upload, X, Eye, MessageSquare } from 'lucide-react';

interface SellerModeProps {
  store: Store;
  products: Product[];
  orders: Order[];
  reviews?: Review[];
  onUpdateOrderStatus: (orderId: string, newStatus: Order['status']) => void;
  onAddProduct: (newProd: Omit<Product, 'id'>) => void;
  onToggleProductAvailability: (productId: string) => void;
  onSelectProduct?: (product: Product) => void;
  onOpenChat?: (
    targetUser: { id: string; name: string; role: UserRole; phone?: string; avatar?: string },
    options?: { orderId?: string; rideId?: string; contextTitle?: string }
  ) => void;
}

export default function SellerMode({
  store,
  products,
  orders,
  reviews,
  onUpdateOrderStatus,
  onAddProduct,
  onToggleProductAvailability,
  onSelectProduct,
  onOpenChat
}: SellerModeProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'products'>('orders');
  const [isStoreOpen, setIsStoreOpen] = useState(store.isActive);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // New product form state with UP TO 10 PHOTOS (Shopee style)
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Makanan Utama');
  const [images, setImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80'
  ]);
  const [newImageUrl, setNewImageUrl] = useState('');

  const storeOrders = orders.filter((o) => o.storeId === store.id);
  const storeProducts = products.filter((p) => p.storeId === store.id);

  const totalRevenue = storeOrders
    .filter((o) => o.status === 'completed' || o.status === 'delivering')
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  // Add a photo to product gallery (Max 10 photos)
  const handleAddPhoto = () => {
    if (!newImageUrl.trim()) return;
    if (images.length >= 10) {
      alert('Maksimal 10 foto per produk (seperti Shopee)');
      return;
    }
    setImages([...images, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  // Remove photo from gallery
  const handleRemovePhoto = (index: number) => {
    if (images.length <= 1) {
      alert('Produk harus memiliki minimal 1 foto utama.');
      return;
    }
    setImages(images.filter((_, i) => i !== index));
  };

  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    const primaryImage = images[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80';

    onAddProduct({
      storeId: store.id,
      name,
      price: Number(price),
      description,
      category,
      image: primaryImage,
      images: images,
      isAvailable: true,
      unit: 'porsi'
    });

    setName('');
    setPrice('');
    setDescription('');
    setImages(['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80']);
    setShowAddProductModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Merchant Header Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={store.image}
            alt={store.name}
            className="w-16 h-16 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-700"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-zinc-900 dark:text-white">
                {store.name}
              </h2>
              <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                {store.category}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{store.address} &bull; Pemilik: {store.ownerName}</p>
          </div>
        </div>

        {/* Store Open/Close Toggle & Chat Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {onOpenChat && (
            <>
              <button
                onClick={() => onOpenChat({ id: 'usr-buyer-1', name: 'Teh Rina Maleber (Pembeli)', role: 'buyer', phone: '081234567890' }, { contextTitle: 'Diskusi Pelanggan Toko' })}
                className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold px-3 py-2 rounded-xl hover:bg-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Chat Pembeli
              </button>
              <button
                onClick={() => onOpenChat({ id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', name: 'Kang Dede (Driver Maleber)', role: 'driver', phone: '082198765433' }, { contextTitle: 'Koordinasi Kurir Driver' })}
                className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-bold px-3 py-2 rounded-xl hover:bg-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Chat Driver
              </button>
            </>
          )}

          <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/80 px-4 py-2 rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Status Toko: {isStoreOpen ? 'BUKA' : 'TUTUP'}
            </span>
            <button
              onClick={() => setIsStoreOpen(!isStoreOpen)}
              className="text-emerald-600 dark:text-emerald-400 cursor-pointer"
            >
              {isStoreOpen ? (
                <ToggleRight className="w-8 h-8 text-emerald-600" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-zinc-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 font-medium">Total Pendapatan</span>
            <h4 className="text-xl font-black text-zinc-900 dark:text-white">
              Rp {totalRevenue.toLocaleString('id-ID')}
            </h4>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 font-medium">Orderan Hari Ini</span>
            <h4 className="text-xl font-black text-zinc-900 dark:text-white">
              {storeOrders.length} Pesanan
            </h4>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-2xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 font-medium">Total Produk Aktif</span>
            <h4 className="text-xl font-black text-zinc-900 dark:text-white">
              {storeProducts.filter((p) => p.isAvailable).length} Produk
            </h4>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pesanan Masuk ({storeOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'products'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <Package className="w-4 h-4" />
          Katalog Produk ({storeProducts.length})
        </button>
      </div>

      {/* TAB: PESANAN MASUK */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {storeOrders.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <Clock className="w-12 h-12 text-zinc-300 mx-auto mb-2" />
              <p className="font-semibold text-zinc-600 text-sm">Belum ada pesanan masuk</p>
              <p className="text-xs text-zinc-400">Pesanan dari warga Maleber akan muncul di sini secara real-time</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...storeOrders]
                .sort((a, b) => {
                  const isAActive = a.status !== 'completed' && a.status !== 'cancelled';
                  const isBActive = b.status !== 'completed' && b.status !== 'cancelled';
                  if (isAActive && !isBActive) return -1;
                  if (!isAActive && isBActive) return 1;
                  return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                })
                .map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-zinc-400 font-mono">{ord.id}</span>
                      <h4 className="font-extrabold text-base text-zinc-900 dark:text-white">
                        {ord.buyerName} ({ord.buyerPhone})
                      </h4>
                      <p className="text-xs text-zinc-500">Alamat: {ord.deliveryAddress}</p>
                    </div>
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full uppercase">
                      {ord.status}
                    </span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-2xl text-xs space-y-1">
                    {ord.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-zinc-800 dark:text-zinc-200">
                        <span>{item.quantity}x {item.productName}</span>
                        <span className="font-semibold">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                    <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2 flex justify-between font-black text-emerald-700 text-sm">
                      <span>Total Pesanan</span>
                      <span>Rp {ord.totalAmount.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  {/* Actions & Chat Buttons */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex gap-2">
                      {/* CHAT PEMBELI */}
                      {onOpenChat && (
                        <button
                          onClick={() => onOpenChat({ id: ord.buyerId || 'usr-buyer-1', name: ord.buyerName, role: 'buyer', phone: ord.buyerPhone }, { orderId: ord.id, contextTitle: `Pemesan (${ord.buyerName})` })}
                          className="flex-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold py-2 rounded-xl hover:bg-emerald-200 transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Chat Pembeli
                        </button>
                      )}

                      {/* CHAT DRIVER */}
                      {onOpenChat && (() => {
                        const dName = ord.driverName || 'Kang Dede (Driver Maleber)';
                        const dId = ord.driverId || 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
                        return (
                          <button
                            onClick={() => onOpenChat({ id: dId, name: dName, role: 'driver' }, { orderId: ord.id, contextTitle: `Kurir Driver (${dName})` })}
                            className="flex-1 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-bold py-2 rounded-xl hover:bg-blue-200 transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Chat Kurir Driver
                          </button>
                        );
                      })()}
                    </div>

                    {ord.status === 'pending' && (
                      <button
                        onClick={() => onUpdateOrderStatus(ord.id, 'cooking')}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-md"
                      >
                        Konfirmasi &amp; Masak
                      </button>
                    )}
                    {ord.status === 'cooking' && (
                      <button
                        onClick={() => onUpdateOrderStatus(ord.id, 'ready_for_pickup')}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-md"
                      >
                        Makanan Siap (Panggil Kurir Driver)
                      </button>
                    )}
                    {ord.status === 'ready_for_pickup' && (
                      <span className="text-xs text-zinc-500 font-medium text-center py-1">Menunggu driver mengambil pesanan...</span>
                    )}
                    {ord.status === 'delivering' && (
                      <span className="text-xs text-emerald-600 font-bold text-center py-1">Sedang diantar oleh: {ord.driverName}</span>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: KATALOG PRODUK (CLICK PRODUCT CARD OPENS DEDICATED PRODUCT DETAIL PAGE) */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white">Daftar Produk Toko ({storeProducts.length})</h4>
              <p className="text-xs text-zinc-500">Klik kartu produk untuk buka Halaman Detail Produk khusus</p>
            </div>
            <button
              onClick={() => setShowAddProductModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah Produk Baru (Hingga 10 Foto)
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {storeProducts.map((prod) => (
              <div 
                key={prod.id} 
                onClick={() => onSelectProduct && onSelectProduct(prod)}
                className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-3 card-hover cursor-pointer group"
              >
                <div className="space-y-2">
                  <div className="relative">
                    <img src={prod.image} alt={prod.name} className="w-full h-36 rounded-2xl object-cover group-hover:scale-105 transition-transform duration-300" />
                    {prod.images && prod.images.length > 1 && (
                      <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> {prod.images.length} Foto
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                      <span className="bg-white text-zinc-950 font-black text-xs px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-amber-600" /> Lihat Detail Halaman
                      </span>
                    </div>
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-amber-600 transition-colors">{prod.name}</h5>
                    <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">{prod.description}</p>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm block mt-1">
                      Rp {prod.price.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-xs text-zinc-400">Status Stok</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleProductAvailability(prod.id);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${
                      prod.isAvailable
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    {prod.isAvailable ? 'Tersedia' : 'Habis'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STORE REVIEWS & COMMENTS FEED — DYNAMIC REAL-TIME DATA FOR THIS STORE */}
      {(() => {
        const myStoreReviews = (reviews || []).filter(
          (r) => r.targetId === store.id && r.targetType === 'store'
        );

        return (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">
                  Ulasan &amp; Rating Toko Saya ({myStoreReviews.length})
                </h3>
              </div>
              <span className="text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-950 px-3 py-1 rounded-full">
                ★ {store.rating || 5.0} ({store.reviewCount || myStoreReviews.length} Penilai)
              </span>
            </div>

            {myStoreReviews.length === 0 ? (
              <div className="text-center py-6 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700/60">
                <Star className="w-8 h-8 text-amber-400/50 mx-auto mb-1" />
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Belum ada ulasan toko</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Ulasan dari pembeli warga Maleber akan muncul di sini secara otomatis.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myStoreReviews.map((rev) => (
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

      {/* ADD PRODUCT MODAL */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 modal-overlay">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-zinc-200 dark:border-zinc-800 modal-content max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-white">Tambah Produk UMKM Maleber</h3>
                <p className="text-xs text-zinc-500">Kelola hingga 10 Foto Galeri Produk (Shopee Style)</p>
              </div>
              <button onClick={() => setShowAddProductModal(false)} className="text-zinc-400 hover:text-zinc-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="space-y-4">
              
              {/* SHOPEE STYLE MULTI-PHOTO GALLERY UPLOADER */}
              <div className="space-y-2.5 bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700/60">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-500" />
                    Foto Produk UMKM ({images.length}/10 Foto):
                  </label>
                  <span className="text-[10px] text-zinc-400">Foto ke-1 = Foto Sampul Utama</span>
                </div>

                {/* Photo Previews Grid */}
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {images.map((url, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
                      <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                      <span className={`absolute top-1 left-1 text-[8px] font-black px-1.5 py-0.5 rounded ${idx === 0 ? 'bg-emerald-600 text-white' : 'bg-black/70 text-white'}`}>
                        {idx === 0 ? 'UTAMA' : `#${idx + 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1 right-1 bg-rose-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] opacity-90 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Hapus foto ini"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* Add photo slot button */}
                  {images.length < 10 && (
                    <div className="aspect-square rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center p-2 text-center bg-white/50 dark:bg-zinc-800/40 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors">
                      <Plus className="w-5 h-5 text-amber-500 mb-0.5" />
                      <span className="text-[9px] font-bold text-zinc-500">+Foto</span>
                    </div>
                  )}
                </div>

                {/* Input Add New Photo URL / Path */}
                {images.length < 10 && (
                  <div className="flex gap-2 pt-2">
                    <input
                      type="url"
                      placeholder="Masukkan URL / Link Foto Produk (https://...)"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddPhoto}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    >
                      + Tambah Foto
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Nama Produk / Makanan</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Paket Nasi Liwet Komplit Cianjur"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Harga Produk (Rp)</label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="25000"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white mt-1"
                >
                  <option value="Makanan Utama">Makanan Utama</option>
                  <option value="Minuman">Minuman</option>
                  <option value="Oleh-oleh">Oleh-oleh &amp; Tauco</option>
                  <option value="Hasil Tani">Hasil Tani (Beras Pandanwangi)</option>
                  <option value="Kerajinan">Kerajinan Bambu Maleber</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Deskripsi Produk</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan bahan alami khas Maleber, rasa lezat, atau keunggulan produk..."
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white mt-1"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md cursor-pointer"
                >
                  Simpan Produk ({images.length} Foto)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
