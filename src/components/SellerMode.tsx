'use client';

import React, { useState } from 'react';
import { Store, Product, Order, Review, UserRole, ProductVariantGroup } from '@/types';
import { Store as StoreIcon, Package, DollarSign, Clock, Plus, CheckCircle, AlertCircle, ToggleLeft, ToggleRight, Edit, Trash2, Image as ImageIcon, Star, Upload, X, Eye, MessageSquare, Camera } from 'lucide-react';
import { calculateOrderFees, SELLER_COMMISSION_RATE, formatRupiah } from '@/lib/feeCalculator';
import AvatarCropModal from './AvatarCropModal';

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
  onToggleStoreStatus?: (storeId: string, isActive: boolean) => void;
  onUpdateStore?: (updatedStore: Store) => void;
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
  onOpenChat,
  onToggleStoreStatus,
  onUpdateStore
}: SellerModeProps) {
  const [selectedOrderModal, setSelectedOrderModal] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'products'>('orders');
  const [orderSubTab, setOrderSubTab] = useState<'ongoing' | 'history'>('ongoing');
  const [isStoreOpen, setIsStoreOpen] = useState(store.isActive);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showCropStoreModal, setShowCropStoreModal] = useState(false);

  // New product form state with UP TO 10 PHOTOS (Shopee style)
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Makanan Utama');
  const [images, setImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80'
  ]);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Pre-Order & ShopeeFood Custom Variant Options state
  const [isPreOrder, setIsPreOrder] = useState(false);
  const [preOrderDays, setPreOrderDays] = useState(1);
  const [variantGroups, setVariantGroups] = useState<ProductVariantGroup[]>([]);

  // Temp state for variant builder
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupRequired, setNewGroupRequired] = useState(false);
  const [activeAddingGroupId, setActiveAddingGroupId] = useState<string | null>(null);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionExtraPrice, setNewOptionExtraPrice] = useState('');

  const storeOrders = orders.filter((o) => o.storeId === store.id);
  const storeProducts = products.filter((p) => p.storeId === store.id);

  const totalGrossRevenue = storeOrders
    .filter((o) => o.status === 'completed' || o.status === 'delivering')
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  // Hitung pendapatan bersih penjual setelah dipotong komisi platform
  const totalSellerNet = storeOrders
    .filter((o) => o.status === 'completed' || o.status === 'delivering')
    .reduce((acc, curr) => {
      const productSubtotal = curr.totalAmount - (curr.deliveryFee || 5000);
      const fees = calculateOrderFees(productSubtotal);
      return acc + fees.sellerNetIncome;
    }, 0);

  const totalSellerCommission = storeOrders
    .filter((o) => o.status === 'completed' || o.status === 'delivering')
    .reduce((acc, curr) => {
      const productSubtotal = curr.totalAmount - (curr.deliveryFee || 5000);
      const fees = calculateOrderFees(productSubtotal);
      return acc + fees.sellerCommission;
    }, 0);

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

  // Variant Builder Handlers
  const handleAddVariantGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: ProductVariantGroup = {
      id: `vg-${Date.now()}`,
      name: newGroupName.trim(),
      required: newGroupRequired,
      options: []
    };
    setVariantGroups([...variantGroups, newGroup]);
    setNewGroupName('');
    setNewGroupRequired(false);
  };

  const handleAddVariantOption = (groupId: string) => {
    if (!newOptionName.trim()) return;
    const priceVal = Number(newOptionExtraPrice) || 0;
    setVariantGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            options: [
              ...g.options,
              {
                id: `opt-${Date.now()}`,
                name: newOptionName.trim(),
                extraPrice: priceVal
              }
            ]
          };
        }
        return g;
      })
    );
    setNewOptionName('');
    setNewOptionExtraPrice('');
  };

  const handleRemoveVariantOption = (groupId: string, optionId: string) => {
    setVariantGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, options: g.options.filter((o: any) => o.id !== optionId) } : g))
    );
  };

  const handleRemoveVariantGroup = (groupId: string) => {
    setVariantGroups((prev) => prev.filter((g) => g.id !== groupId));
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
      unit: 'porsi',
      isPreOrder,
      preOrderDays: isPreOrder ? Number(preOrderDays) || 1 : undefined,
      variantGroups: variantGroups.length > 0 ? variantGroups : undefined
    });

    setName('');
    setPrice('');
    setDescription('');
    setIsPreOrder(false);
    setPreOrderDays(1);
    setVariantGroups([]);
    setImages(['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80']);
    setShowAddProductModal(false);
  };

  const ongoingOrders = storeOrders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
  const historyOrders = storeOrders.filter((o) => o.status === 'completed' || o.status === 'cancelled');
  const displayedOrders = (orderSubTab === 'ongoing' ? ongoingOrders : historyOrders)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Merchant Header Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative group shrink-0">
            <img
              src={store.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'}
              alt={store.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-700 shadow-sm"
            />
            <button
              onClick={() => setShowCropStoreModal(true)}
              className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-extrabold gap-0.5 cursor-pointer"
              title="Ubah Foto Toko UMKM"
            >
              <Camera className="w-5 h-5 text-white" />
              <span>Ubah Foto</span>
            </button>
          </div>
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

        {/* Store Open/Close Toggle */}
        <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/80 px-4 py-2 rounded-2xl border border-zinc-200 dark:border-zinc-700">
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
            Status Toko: {isStoreOpen ? 'BUKA' : 'TUTUP'}
          </span>
          <button
            onClick={() => {
              const nextStatus = !isStoreOpen;
              setIsStoreOpen(nextStatus);
              if (onToggleStoreStatus) {
                onToggleStoreStatus(store.id, nextStatus);
              }
            }}
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

      {/* Analytics Stat Cards (Clickable) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-4 text-left hover:border-emerald-500/60 hover:shadow-emerald-500/10 hover:shadow-lg transition-all cursor-pointer group active:scale-98"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] text-zinc-500 font-medium">Pendapatan Bersih Toko</span>
              <h4 className="text-xl font-black text-zinc-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                {formatRupiah(totalSellerNet)}
              </h4>
              <p className="text-[10px] text-rose-500 font-bold">Komisi platform: -{formatRupiah(totalSellerCommission)} ({(SELLER_COMMISSION_RATE * 100).toFixed(0)}%)</p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-4 text-left hover:border-amber-500/60 hover:shadow-amber-500/10 hover:shadow-lg transition-all cursor-pointer group active:scale-98"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] text-zinc-500 font-medium">Orderan Hari Ini</span>
              <h4 className="text-xl font-black text-zinc-900 dark:text-white group-hover:text-amber-600 transition-colors">
                {storeOrders.length} Pesanan
              </h4>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-4 text-left hover:border-blue-500/60 hover:shadow-blue-500/10 hover:shadow-lg transition-all cursor-pointer group active:scale-98"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] text-zinc-500 font-medium">Total Produk Aktif</span>
              <h4 className="text-xl font-black text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors">
                {storeProducts.filter((p) => p.isAvailable).length} Produk
              </h4>
            </div>
          </div>
        </button>
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
          
          {/* Sub-tabs for Seller Orders: Ongoing vs History */}
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOrderSubTab('ongoing')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  orderSubTab === 'ongoing'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                }`}
              >
                <span>⚡ Pesanan Berjalan ({ongoingOrders.length})</span>
                {ongoingOrders.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setOrderSubTab('history')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  orderSubTab === 'history'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                }`}
              >
                <span>📜 Riwayat Selesai &amp; Batal ({historyOrders.length})</span>
              </button>
            </div>
            <span className="text-[11px] font-semibold text-zinc-400">
              Urutan: Terbaru ke Terlama
            </span>
          </div>

          {displayedOrders.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <Clock className="w-12 h-12 text-zinc-300 mx-auto mb-2" />
              <p className="font-semibold text-zinc-600 text-sm">
                {orderSubTab === 'ongoing'
                  ? 'Belum ada pesanan yang sedang berjalan'
                  : 'Belum ada riwayat pesanan selesai/batal'}
              </p>
              <p className="text-xs text-zinc-400">
                {orderSubTab === 'ongoing'
                  ? 'Pesanan baru dari warga Maleber akan muncul di sini secara real-time'
                  : 'Pesanan yang telah Anda selesaikan atau batalkan akan diarsip di sini dengan tampilan pudar'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedOrders.map((ord) => {
                const isFaded = ord.status === 'completed' || ord.status === 'cancelled';
                return (
                  <div
                    key={ord.id}
                    onClick={() => setSelectedOrderModal(ord)}
                    className={`p-5 rounded-3xl border shadow-sm space-y-4 transition-all cursor-pointer group ${
                      isFaded
                        ? 'bg-zinc-100/70 dark:bg-zinc-950/40 border-zinc-200/50 dark:border-zinc-800/50 opacity-45 grayscale filter saturate-50'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-amber-500/50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs text-zinc-400 font-mono">#{ord.id.slice(-8)}</span>
                        <h4 className="font-extrabold text-base text-zinc-900 dark:text-white group-hover:text-amber-600 transition-colors">
                          {ord.buyerName} ({ord.buyerPhone})
                        </h4>
                        <p className="text-xs text-zinc-500">Alamat: {ord.deliveryAddress}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                          ord.status === 'cancelled'
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : ord.status === 'completed'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                        }`}>
                          {ord.status === 'cancelled' ? 'DIBATALKAN' : ord.status === 'completed' ? 'SELESAI' : ord.status === 'cooking' ? 'DISIAPKAN' : ord.status === 'ready_for_pickup' ? 'SIAP DIAMBIL' : ord.status === 'delivering' ? 'SEDANG DIANTAR' : 'PROSES'}
                        </span>

                        {/* Payment Method Badge: QRIS LUNAS or COD */}
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                          ord.paymentMethod === 'qris'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                            : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300'
                        }`}>
                          {ord.paymentMethod === 'qris' ? '💳 QRIS LUNAS' : '💵 COD (BAYAR DI TEMPAT)'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-2xl text-xs space-y-1">
                      {ord.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-zinc-800 dark:text-zinc-200">
                          <span>{item.quantity}x {item.productName}</span>
                          <span className="font-semibold">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                      <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2 flex justify-between font-black text-emerald-700 text-sm">
                        <span>Total Pesanan ({ord.paymentMethod === 'qris' ? 'QRIS' : 'COD'})</span>
                        <span>Rp {ord.totalAmount.toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    {/* Actions & Chat Buttons */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800" onClick={(e) => e.stopPropagation()}>
                      {ord.status !== 'completed' && ord.status !== 'cancelled' && (
                        <div className="flex gap-2">
                          {/* CHAT PEMBELI */}
                          {onOpenChat && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenChat({ id: ord.buyerId || 'usr-buyer-1', name: ord.buyerName, role: 'buyer', phone: ord.buyerPhone }, { orderId: ord.id, contextTitle: `Pemesan (${ord.buyerName})` });
                              }}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-white" />
                              Chat Pembeli
                            </button>
                          )}

                          {/* CHAT DRIVER (Only show if a driver has actually taken/accepted the order) */}
                          {onOpenChat && Boolean(ord.driverId) && (() => {
                            const dName = ord.driverName || 'Kang Dede (Driver Maleber)';
                            const dId = ord.driverId || 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenChat({ id: dId, name: dName, role: 'driver' }, { orderId: ord.id, contextTitle: `Kurir Driver (${dName})` });
                                }}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-white" />
                                Chat Kurir Driver
                              </button>
                            );
                          })()}
                        </div>
                      )}

                      {ord.status === 'pending' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateOrderStatus(ord.id, 'cooking');
                          }}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs py-3 rounded-2xl transition-all cursor-pointer shadow-md text-center"
                        >
                          Terima &amp; Masak Pesanan
                        </button>
                      )}
                      {ord.status === 'cooking' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateOrderStatus(ord.id, 'ready_for_pickup');
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-2xl transition-all cursor-pointer shadow-md text-center"
                        >
                          Makanan Siap (Panggil Kurir Driver)
                        </button>
                      )}
                      {ord.status === 'ready_for_pickup' && (
                        <div className="bg-amber-50 dark:bg-amber-950/60 p-2.5 rounded-xl text-center border border-amber-200/80 dark:border-amber-800/80">
                          <span className="text-xs text-amber-800 dark:text-amber-300 font-bold block animate-pulse">
                            ⏳ Menunggu Driver Mengambil Pesanan...
                          </span>
                        </div>
                      )}
                      {ord.status === 'delivering' && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2.5 rounded-xl text-center border border-emerald-200/80 dark:border-emerald-800/80">
                          <span className="text-xs text-emerald-800 dark:text-emerald-300 font-bold block">
                            🛵 Sedang diantar oleh: {ord.driverName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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

        const realReviewCount = myStoreReviews.length;
        const realAvgRating = realReviewCount > 0
          ? (myStoreReviews.reduce((sum, r) => sum + r.rating, 0) / realReviewCount).toFixed(1)
          : '0.0';

        return (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">
                  Ulasan &amp; Rating Toko Saya ({realReviewCount})
                </h3>
              </div>
              <span className="text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-950 px-3 py-1 rounded-full">
                ★ {realAvgRating} ({realReviewCount} Penilai)
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
                <p className="text-xs text-zinc-500">Kelola hingga 10 Foto Galeri Produk</p>
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
                  rows={2}
                />
              </div>

              {/* 📦 PRE-ORDER SYSTEM SETTING */}
              <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-extrabold text-amber-900 dark:text-amber-200">Sistem Pre-Order (PO)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPreOrder(!isPreOrder)}
                    className="cursor-pointer"
                  >
                    {isPreOrder ? (
                      <ToggleRight className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-zinc-400" />
                    )}
                  </button>
                </div>

                {isPreOrder && (
                  <div className="flex items-center gap-3 pt-1 border-t border-amber-200/60 dark:border-amber-800/60">
                    <label className="text-xs font-bold text-amber-900 dark:text-amber-200 shrink-0">Estimasi Waktu PO (Hari):</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={preOrderDays}
                      onChange={(e) => setPreOrderDays(Number(e.target.value) || 1)}
                      className="w-20 bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-700 rounded-xl px-3 py-1.5 text-xs font-black text-amber-900 dark:text-amber-100"
                    />
                    <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">Hari sebelum pengiriman</span>
                  </div>
                )}
              </div>

              {/* 🍱 SHOPEEFOOD STYLE CUSTOM MENU OPTIONS & VARIANTS BUILDER */}
              <div className="bg-zinc-50 dark:bg-zinc-800/70 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      🍱 Opsi &amp; Varian Kustom Produk
                    </h4>
                    <p className="text-[11px] text-zinc-500">Atur pilihan sambal, lauk tambahan, topping, dll.</p>
                  </div>
                </div>

                {/* List of Created Variant Groups */}
                {variantGroups.length > 0 && (
                  <div className="space-y-3">
                    {variantGroups.map((g) => (
                      <div key={g.id} className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-zinc-900 dark:text-white">{g.name}</span>
                            {g.required && (
                              <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Wajib Pilih</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariantGroup(g.id)}
                            className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus Grup
                          </button>
                        </div>

                        {/* Existing Options */}
                        <div className="space-y-1.5">
                          {g.options.map((opt: any) => (
                            <div key={opt.id} className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 rounded-lg text-xs font-semibold">
                              <span>{opt.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  {opt.extraPrice > 0 ? `+${formatRupiah(opt.extraPrice)}` : 'Gratis (+Rp 0)'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariantOption(g.id, opt.id)}
                                  className="text-zinc-400 hover:text-rose-500 cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add Option Form inside Group */}
                        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
                          <input
                            type="text"
                            placeholder="Nama pilihan (ex: Sambal Terasi, Extra Ayam)..."
                            value={activeAddingGroupId === g.id ? newOptionName : ''}
                            onFocus={() => setActiveAddingGroupId(g.id)}
                            onChange={(e) => {
                              setActiveAddingGroupId(g.id);
                              setNewOptionName(e.target.value);
                            }}
                            className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-white"
                          />
                          <input
                            type="number"
                            placeholder="Harga Tambahan (Rp 0)..."
                            value={activeAddingGroupId === g.id ? newOptionExtraPrice : ''}
                            onFocus={() => setActiveAddingGroupId(g.id)}
                            onChange={(e) => {
                              setActiveAddingGroupId(g.id);
                              setNewOptionExtraPrice(e.target.value);
                            }}
                            className="w-28 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddVariantOption(g.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer shrink-0"
                          >
                            + Pilihan
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Variant Group Form */}
                <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2">
                  <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">+ Tambah Grup Varian / Opsi Baru</span>
                  <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <input
                      type="text"
                      placeholder="Nama Grup (ex: Pilihan Sambal, Lauk Extra)..."
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="flex-1 min-w-[180px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white"
                    />
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 px-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newGroupRequired}
                        onChange={(e) => setNewGroupRequired(e.target.checked)}
                        className="accent-amber-600"
                      />
                      Wajib Pilih
                    </label>
                    <button
                      type="button"
                      onClick={handleAddVariantGroup}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer shrink-0"
                    >
                      + Buat Grup
                    </button>
                  </div>
                </div>
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

      {/* SELLER ORDER DETAIL MODAL */}
      {selectedOrderModal && (
        <div
          className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 modal-overlay"
          onClick={() => setSelectedOrderModal(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-zinc-200 dark:border-zinc-800 modal-content relative max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold text-lg">
                  🏪
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">
                    Detail Pesanan Makanan Toko
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono">ID Pesanan: #{selectedOrderModal.id.slice(-8)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderModal(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold flex items-center justify-center cursor-pointer hover:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            {/* INFORMASI PEMBELI & PENGIRIMAN */}
            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl space-y-3 text-xs border border-zinc-200/60 dark:border-zinc-700/60">
              <h4 className="font-extrabold text-xs text-zinc-900 dark:text-white uppercase tracking-wider">
                👤 Detail Pemesan &amp; Alamat Pengiriman
              </h4>

              <div className="flex items-start gap-2.5">
                <span className="text-base">👤</span>
                <div>
                  <span className="text-[10px] font-extrabold text-zinc-500">Nama Pelanggan / Warga</span>
                  <p className="font-bold text-zinc-900 dark:text-white">{selectedOrderModal.buyerName} ({selectedOrderModal.buyerPhone})</p>
                </div>
              </div>
              <div className="border-t border-dashed border-zinc-200 dark:border-zinc-700 pt-2 flex items-start gap-2.5">
                <span className="text-base">📍</span>
                <div>
                  <span className="text-[10px] font-extrabold text-emerald-600">Alamat Pengiriman Tujuan</span>
                  <p className="font-bold text-zinc-900 dark:text-white">{selectedOrderModal.deliveryAddress}</p>
                </div>
              </div>
            </div>

            {/* DAFTAR BARANG YANG DIPESAN */}
            <div className="bg-amber-50 dark:bg-amber-950/50 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-2 text-xs">
              <h4 className="font-extrabold text-xs text-amber-900 dark:text-amber-200 uppercase tracking-wider mb-2">
                🛍️ Item Barang Diproses Toko ({selectedOrderModal.items.length})
              </h4>

              <div className="space-y-1.5 pb-2 border-b border-amber-200 dark:border-amber-800">
                {selectedOrderModal.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-zinc-800 dark:text-zinc-200">
                    <span>{it.quantity}x <b>{it.productName}</b></span>
                    <span className="font-semibold tabular-nums">Rp {(it.price * it.quantity).toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>

              {(() => {
                const productSubtotal = selectedOrderModal.totalAmount - (selectedOrderModal.deliveryFee || 5000);
                const orderFees = calculateOrderFees(productSubtotal);
                return (
                  <>
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400 pt-1">
                      <span>Subtotal Penjualan Produk</span>
                      <span className="font-bold tabular-nums">{formatRupiah(productSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-rose-500 dark:text-rose-400">
                      <span>Potongan Komisi Platform ({(SELLER_COMMISSION_RATE * 100).toFixed(0)}%)</span>
                      <span className="font-bold tabular-nums">-{formatRupiah(orderFees.sellerCommission)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500 dark:text-zinc-500 text-[10px]">
                      <span>Ongkir Kurir (masuk ke driver)</span>
                      <span className="font-bold tabular-nums">{formatRupiah(selectedOrderModal.deliveryFee || 5000)}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-amber-900 dark:text-amber-200 pt-2 border-t border-amber-200 dark:border-amber-800">
                      <span>Pendapatan Bersih Penjual</span>
                      <span className="tabular-nums">{formatRupiah(orderFees.sellerNetIncome)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* MODAL POTONG / UBAH FOTO TOKO UMKM */}
      <AvatarCropModal
        isOpen={showCropStoreModal}
        onClose={() => setShowCropStoreModal(false)}
        initialImage={store.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'}
        onCropComplete={async (croppedUrl) => {
          const updated = { ...store, image: croppedUrl };
          if (onUpdateStore) onUpdateStore(updated);
          try {
            await fetch('/api/db', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'update_store',
                data: { id: store.id, image: croppedUrl }
              })
            });
          } catch (e) {}
          setShowCropStoreModal(false);
        }}
      />

    </div>
  );
}
