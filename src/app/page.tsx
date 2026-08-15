'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import LandingPage from '@/components/LandingPage';
import BuyerMode from '@/components/BuyerMode';
import SellerMode from '@/components/SellerMode';
import DriverMode from '@/components/DriverMode';
import AdminMode from '@/components/AdminMode';
import ProductDetailPage from '@/components/ProductDetailPage';
import CartModal from '@/components/CartModal';
import AuthModal from '@/components/AuthModal';
import ProfileModal from '@/components/ProfileModal';
import ChatModal from '@/components/ChatModal';
import { LegalModal } from '@/components/LegalModal';
import ToastContainer, { ToastMessage, ToastType } from '@/components/Toast';
import { playNotificationSound } from '@/lib/soundAlert';

import { UserRole, UserProfile, Store, Product, CartItem, Order, RideRequest, DriverInfo, ChatMessage, Review, PlacePOI, PasswordResetRequest } from '@/types';
import { triggerSystemNotification } from '@/lib/notificationUtils';
import {
  INITIAL_USERS,
  INITIAL_STORES,
  INITIAL_PRODUCTS,
  INITIAL_DRIVERS,
  INITIAL_ORDERS,
  INITIAL_RIDES,
  INITIAL_REVIEWS,
  INITIAL_PLACES
} from '@/lib/mockData';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export default function Home() {
  const [isLandingActive, setIsLandingActive] = useState(true);
  const [currentRole, setCurrentRole] = useState<UserRole>('buyer');

  // Selected Product for Dedicated Product Detail Page
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastType, title: string, message?: string) => {
    const newToast: ToastMessage = { id: `toast-${Date.now()}-${Math.random()}`, type, title, message };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Theme state defaulting to OS system preference
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    // Check if user has saved theme preference in localStorage or match system device
    const savedTheme = localStorage.getItem('maleber_theme') as 'dark' | 'light' | null;
    let initialTheme: 'dark' | 'light' = 'light';

    if (savedTheme) {
      initialTheme = savedTheme;
    } else if (typeof window !== 'undefined' && window.matchMedia) {
      initialTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Toggle Dark/Light Theme
  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('maleber_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Application Data State (Loaded 100% Live from Supabase PostgreSQL)
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [places, setPlaces] = useState<PlacePOI[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms'>('privacy');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeChatTarget, setActiveChatTarget] = useState<{
    targetUser: { id: string; name: string; role: UserRole; phone?: string; avatar?: string };
    orderId?: string;
    rideId?: string;
    contextTitle?: string;
  } | null>(null);

  // FETCH LIVE DATA DIRECTLY FROM SUPABASE POSTGRESQL API ROUTE (REAL-TIME 2.5s POLLING)
  const loadLiveSupabaseData = async () => {
    try {
      const res = await fetch('/api/db');
      const data = await res.json();
      if (data.success) {
        if (data.users !== undefined) setUsers(data.users);
        const currentReviews: Review[] = data.reviews || [];
        if (data.reviews !== undefined) setReviews(data.reviews);

        if (data.drivers !== undefined) {
          const updatedDrivers = (data.drivers || []).map((drv: DriverInfo) => {
            const driverRevs = currentReviews.filter(
              (r: Review) => (r.targetId === drv.id || r.targetId === drv.name) && r.targetType === 'driver'
            );
            if (driverRevs.length > 0) {
              const avg = driverRevs.reduce((sum: number, r: Review) => sum + r.rating, 0) / driverRevs.length;
              return { ...drv, rating: Math.round(avg * 10) / 10, reviewCount: driverRevs.length };
            }
            return { ...drv, rating: drv.rating || 5.0, reviewCount: drv.reviewCount || 1 };
          });
          setDrivers(updatedDrivers);
        }

        if (data.stores !== undefined) {
          const updatedStores = (data.stores || []).map((st: Store) => {
            const storeRevs = currentReviews.filter(
              (r: Review) => r.targetId === st.id && r.targetType === 'store'
            );
            if (storeRevs.length > 0) {
              const avg = storeRevs.reduce((sum: number, r: Review) => sum + r.rating, 0) / storeRevs.length;
              return { ...st, rating: Math.round(avg * 10) / 10, reviewCount: storeRevs.length };
            }
            return { ...st, rating: st.rating || 5.0, reviewCount: st.reviewCount || 1 };
          });
          setStores(updatedStores);
        }

        if (data.products !== undefined) {
          const updatedProducts = (data.products || []).map((p: Product) => {
            const pRevs = currentReviews.filter(
              (r: Review) => r.targetId === p.id && r.targetType === 'product'
            );
            if (pRevs.length > 0) {
              const avg = pRevs.reduce((sum: number, r: Review) => sum + r.rating, 0) / pRevs.length;
              return { ...p, rating: Math.round(avg * 10) / 10 };
            }
            return { ...p, rating: 0 };
          });
          setProducts(updatedProducts);
        }

        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        if (data.orders !== undefined) {
          const recentOrders = (data.orders || []).filter((o: Order) => {
            const t = new Date(o.createdAt).getTime();
            return !isNaN(t) && (now - t) <= THIRTY_DAYS_MS;
          });
          setOrders(recentOrders);
        }
        if (data.rides !== undefined) {
          const recentRides = (data.rides || []).filter((r: RideRequest) => {
            const t = new Date(r.createdAt).getTime();
            return !isNaN(t) && (now - t) <= THIRTY_DAYS_MS;
          });
          setRides(recentRides);
        }
        if (data.messages !== undefined) setMessages(data.messages);
        if (data.resetRequests !== undefined) setResetRequests(data.resetRequests);
      }
    } catch (err) {
      console.error('Failed to load live data from Supabase DB:', err);
    }
  };

  useEffect(() => {
    loadLiveSupabaseData();
    const interval = setInterval(() => {
      loadLiveSupabaseData();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auth & Profile User State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [authInitialRole, setAuthInitialRole] = useState<UserRole>('buyer');

  const handleSaveProfile = async (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('maleber_user', JSON.stringify(updatedUser));

    // If driver updated vehicleInfo, sync vehicle info to drivers list and driver_vehicles table
    if (updatedUser.role === 'driver' && updatedUser.vehicleInfo) {
      const vInfo = updatedUser.vehicleInfo;
      const match = vInfo.match(/^(.*?)(?:\s*\((.*?)\))?$/);
      const modelName = match && match[1] ? match[1].trim() : vInfo;
      const plateNum = match && match[2] ? match[2].trim() : 'F 3312 WX';

      setDrivers((prev) =>
        prev.map((d) =>
          d.id === updatedUser.id || d.name === updatedUser.name
            ? { ...d, vehicleModel: modelName, vehicleNumber: plateNum }
            : d
        )
      );

      try {
        await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_driver_vehicle',
            data: {
              driverId: updatedUser.id,
              vehicleInfo: vInfo,
              vehicleModel: modelName,
              vehicleNumber: plateNum
            }
          })
        });
      } catch (e) { }
    }

    addToast('success', 'Profil Terperbarui! 👤', 'Data profil & informasi Anda berhasil disimpan.');
  };

  // SESSION PERSISTENCE HANDLERS (STAY LOGGED IN ON BROWSER REFRESH)
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('maleber_user');
      const savedLanding = localStorage.getItem('maleber_landing_active');
      if (savedUser) {
        const parsedUser: UserProfile = JSON.parse(savedUser);
        setCurrentUser(parsedUser);
        setCurrentRole(parsedUser.role);
        if (savedLanding === 'false') {
          setIsLandingActive(false);
        }
      }
    } catch (e) { }
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('maleber_user', JSON.stringify(currentUser));
      localStorage.setItem('maleber_landing_active', String(isLandingActive));
    } else {
      localStorage.removeItem('maleber_user');
      localStorage.removeItem('maleber_landing_active');
    }
  }, [currentUser, isLandingActive]);

  // AUTH HANDLERS
  const handleOpenAuth = (mode: 'login' | 'register' = 'login', role: UserRole = 'buyer') => {
    setAuthInitialMode(mode);
    setAuthInitialRole(role);
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    setIsLandingActive(false);
    setSelectedProductDetail(null);
    localStorage.setItem('maleber_user', JSON.stringify(user));
    localStorage.setItem('maleber_landing_active', 'false');
    addToast('success', `Selamat datang, ${user.name}!`, `Masuk sebagai ${user.role === 'admin' ? 'Petugas Desa' : user.role === 'seller' ? 'Penjual UMKM' : user.role === 'driver' ? 'Mitra Driver Ojek' : 'Warga Maleber'}`);
  };

  const handleEnterApp = (role?: UserRole) => {
    if (!currentUser) {
      handleOpenAuth('login', role || 'buyer');
      addToast('info', 'Silakan Masuk Terlebih Dahulu', 'Anda harus masuk ke akun Anda terlebih dahulu untuk mengakses layanan Desa Maleber.');
      return;
    }
    if (role) setCurrentRole(role);
    setIsLandingActive(false);
    setSelectedProductDetail(null);
    localStorage.setItem('maleber_landing_active', 'false');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedProductDetail(null);
    setIsLandingActive(true);
    localStorage.removeItem('maleber_user');
    localStorage.removeItem('maleber_landing_active');
    addToast('info', 'Berhasil Keluar', 'Sampai jumpa kembali di Desa Maleber!');
  };

  // CART HANDLERS
  const handleAddToCart = (
    product: Product,
    quantity = 1,
    notes?: string,
    selectedVariants?: { groupName: string; optionName: string; extraPrice: number }[]
  ) => {
    setCart((prev) => {
      return [...prev, { product, quantity, notes, selectedVariants }];
    });
    addToast('success', 'Masuk Keranjang!', `${quantity}x ${product.name} telah ditambahkan.`);
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleClearCart = () => setCart([]);

  const handleCreateOrder = async (
    deliveryAddress: string,
    lat: number,
    lng: number,
    paymentMethod: 'qris' | 'cod' = 'cod',
    paymentStatus: 'paid' | 'unpaid' | 'cod' = 'cod'
  ) => {
    if (cart.length === 0) return;
    const targetStoreId = cart[0].product.storeId;
    const targetStore = stores.find((s) => s.id === targetStoreId);

    const subtotal = cart.reduce((acc, c) => acc + c.product.price * c.quantity, 0);

    // Generate valid hex UUID for Supabase
    const orderId = `10000000-${Date.now().toString().slice(-4)}-4000-8000-${Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0')}`;

    const newOrder: Order = {
      id: orderId,
      buyerId: currentUser?.id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      buyerName: currentUser?.name || 'Teh Rina Maleber',
      buyerPhone: currentUser?.phone || '081234567890',
      storeId: targetStoreId,
      storeName: targetStore?.name || 'Toko UMKM Maleber',
      items: cart.map((c) => ({
        productId: c.product.id,
        productName: c.product.name,
        price: c.product.price,
        quantity: c.quantity,
        notes: c.notes
      })),
      totalAmount: subtotal + 5000 + 2000,
      deliveryFee: 5000,
      status: 'pending',
      paymentMethod,
      paymentStatus,
      deliveryAddress,
      lat,
      lng,
      createdAt: new Date().toISOString()
    };

    setOrders((prev) => [newOrder, ...prev]);
    setCart([]);
    setIsCartOpen(false);

    triggerSystemNotification('🍔 Pesanan Makanan Dikirim!', {
      body: `Pesanan makanan Anda di ${newOrder.storeName} berhasil dikirim!`,
      soundType: 'order'
    });

    // Send order confirmation email via Resend API if buyer has valid email
    if (currentUser?.email && currentUser.email.includes('@')) {
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: currentUser.email,
          type: 'order',
          name: currentUser.name || 'Warga Maleber',
          orderDetails: {
            id: newOrder.id,
            storeName: newOrder.storeName,
            totalAmount: newOrder.totalAmount,
            deliveryAddress: newOrder.deliveryAddress
          }
        })
      }).catch((e) => console.error('Order Resend email error:', e));
    }

    // Write row directly into Supabase PostgreSQL orders table
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_order', data: newOrder })
      });
      addToast('success', paymentMethod === 'qris' ? 'Pembayaran QRIS Lunas! 💳' : 'Pesanan Berhasil Dikirim! 🍽️', `Toko ${newOrder.storeName} telah menerima pesanan Anda.`);
    } catch (e) {
      console.error('Order post error:', e);
      addToast('success', 'Pesanan Makanan Dikirim!', `Toko ${newOrder.storeName} telah menerima pesanan Anda.`);
    }
  };

  // CREATE RIDE REQUEST (WRITES DIRECTLY TO SUPABASE POSTGRESQL RIDE_REQUESTS TABLE)
  const handleCreateRide = async (
    pickupAddress: string,
    pickupLat: number,
    pickupLng: number,
    destAddress: string,
    destLat: number,
    destLng: number,
    distanceKm: number,
    fare: number,
    paymentMethod: 'qris' | 'cod' = 'cod',
    paymentStatus: 'paid' | 'unpaid' | 'cod' = 'cod'
  ) => {
    const rideId = `20000000-${Date.now().toString().slice(-4)}-4000-8000-${Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0')}`;

    const newRide: RideRequest = {
      id: rideId,
      passengerId: currentUser?.id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      passengerName: currentUser?.name || 'Teh Rina Maleber',
      passengerPhone: currentUser?.phone || '081234567890',
      pickupAddress,
      pickupLat,
      pickupLng,
      destAddress,
      destLat,
      destLng,
      distanceKm,
      fare,
      status: 'requested',
      paymentMethod,
      paymentStatus,
      createdAt: new Date().toISOString()
    };

    setRides((prev) => [newRide, ...prev]);

    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_ride', data: newRide })
      });
      addToast('success', paymentMethod === 'qris' ? 'Ojek Dibayar Via QRIS! 💳' : 'Ojek Berhasil Dipesan! 🛵', `Tarif: Rp ${fare.toLocaleString('id-ID')}. Mencari driver terdekat...`);
    } catch (e) {
      addToast('success', 'Ojek Berhasil Dipesan! 🛵', `Tarif: Rp ${fare.toLocaleString('id-ID')}. Mencari driver terdekat...`);
    }
  };

  // RATING SUBMISSION HANDLER (SAVED TO SUPABASE REVIEWS TABLE)
  const handleSubmitRating = async (
    targetId: string,
    targetType: 'store' | 'driver' | 'product',
    newRating: number,
    comment: string
  ) => {
    const revId = `30000000-${Date.now().toString().slice(-4)}-4000-8000-${Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0')}`;

    const newRev: Review = {
      id: revId,
      targetId,
      targetType,
      userId: currentUser?.id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      userName: currentUser?.name || 'Teh Rina Maleber',
      rating: newRating,
      comment,
      createdAt: new Date().toISOString()
    };
    setReviews((prev) => [newRev, ...prev]);

    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_review',
          data: {
            id: revId,
            targetId,
            targetType,
            userId: currentUser?.id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            userName: currentUser?.name || 'Teh Rina Maleber',
            rating: newRating,
            comment
          }
        })
      });
    } catch (e) {
      console.error('Review post error:', e);
    }

    if (targetType === 'product') {
      const allProductRevs = [newRev, ...reviews].filter((r) => r.targetId === targetId && r.targetType === 'product');
      const avg = Math.round((allProductRevs.reduce((acc, r) => acc + r.rating, 0) / allProductRevs.length) * 10) / 10;
      setProducts((prev) =>
        prev.map((p) => (p.id === targetId ? { ...p, rating: avg } : p))
      );
      addToast('success', 'Ulasan Berhasil Terkirim! ⭐', 'Terima kasih atas penilaian dan ulasan Anda.');
    } else if (targetType === 'store') {
      const allStoreRevs = [newRev, ...reviews].filter((r) => r.targetId === targetId && r.targetType === 'store');
      const avg = Math.round((allStoreRevs.reduce((acc, r) => acc + r.rating, 0) / allStoreRevs.length) * 10) / 10;
      setStores((prev) =>
        prev.map((s) => (s.id === targetId ? { ...s, rating: avg, reviewCount: allStoreRevs.length } : s))
      );
      addToast('success', 'Ulasan Warung Terkirim! ⭐', 'Terima kasih telah mendukung UMKM Desa Maleber.');
    } else {
      const allDriverRevs = [newRev, ...reviews].filter((r) => r.targetId === targetId && r.targetType === 'driver');
      const avg = Math.round((allDriverRevs.reduce((acc, r) => acc + r.rating, 0) / allDriverRevs.length) * 10) / 10;
      setDrivers((prev) =>
        prev.map((d) => (d.id === targetId ? { ...d, rating: avg, reviewCount: allDriverRevs.length } : d))
      );
      addToast('success', 'Ulasan Driver Terkirim! ⭐ 🛵', `Driver mendapat rating ${avg} ⭐ dari ${allDriverRevs.length} ulasan.`);
    }
  };

  // ORDER STATUS HANDLERS
  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );

    // Auto-delete order chat messages on completion or cancellation
    if (newStatus === 'completed' || newStatus === 'cancelled') {
      setMessages((prev) => prev.filter((m) => m.orderId !== orderId));
    }

    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_order_status', data: { orderId, status: newStatus } })
      });
    } catch (e) { }

    const statusLabels: Record<string, string> = {
      pending: 'Menunggu Konfirmasi Penjual',
      cooking: 'Sedang Dimasak / Disiapkan Penjual',
      ready_for_pickup: 'Pesanan Siap (Memanggil Driver Kurir)',
      delivering: 'Pesanan Sedang Diantar Kurir',
      completed: 'Pesanan Makanan Selesai Diterima',
      cancelled: 'Pesanan Telah Dibatalkan'
    };

    addToast('info', 'Status Pesanan Diperbarui', statusLabels[newStatus] || 'Status pesanan telah diperbarui');
  };

  const handleCancelOrder = async (orderId: string, reason?: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'cancelled', cancelReason: reason } : o))
    );
    setMessages((prev) => prev.filter((m) => m.orderId !== orderId));
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_order_status', data: { orderId, status: 'cancelled', cancelReason: reason } })
      });
    } catch (e) { }
    addToast('warning', 'Pesanan Dibatalkan', reason ? `Alasan: ${reason}` : 'Pesanan makanan berhasil dibatalkan.');
  };

  const handleCancelRide = async (rideId: string, reason?: string) => {
    setRides((prev) =>
      prev.map((r) => (r.id === rideId ? { ...r, status: 'cancelled', cancelReason: reason } : r))
    );
    setMessages((prev) => prev.filter((m) => m.rideId !== rideId));
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_ride_status', data: { rideId, status: 'cancelled', cancelReason: reason } })
      });
    } catch (e) { }
    addToast('warning', 'Perjalanan Ojek Dibatalkan', reason ? `Alasan: ${reason}` : 'Pemesanan ojek online berhasil dibatalkan.');
  };

  const handleAcceptOrderDelivery = async (orderId: string, driverId: string, driverName: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, driverId, driverName, status: 'delivering' }
          : o
      )
    );
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_order_status', data: { orderId, status: 'delivering', driverId, driverName } })
      });
    } catch (e) { }
    addToast('success', 'Pengantaran Diproses!', `Mitra Driver ${driverName} siap mengantar pesanan Anda.`);
  };

  // RIDE STATUS HANDLERS
  const handleAcceptRide = async (rideId: string, driverId: string, driverName: string) => {
    setRides((prev) =>
      prev.map((r) =>
        r.id === rideId
          ? { ...r, driverId, driverName, status: 'accepted' }
          : r
      )
    );
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_ride_status', data: { rideId, status: 'accepted', driverId, driverName } })
      });
    } catch (e) { }
    addToast('success', 'Order Ojek Diterima!', `Driver ${driverName} sedang menuju ke titik penjemputan Anda.`);
  };

  const handleUpdateRideStatus = async (rideId: string, newStatus: RideRequest['status']) => {
    setRides((prev) =>
      prev.map((r) => (r.id === rideId ? { ...r, status: newStatus } : r))
    );

    // Auto-delete ride chat messages on completion or cancellation
    if (newStatus === 'completed' || newStatus === 'cancelled') {
      setMessages((prev) => prev.filter((m) => m.rideId !== rideId));
    }
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_ride_status', data: { rideId, status: newStatus } })
      });
    } catch (e) { }

    const rideStatusLabels: Record<string, string> = {
      requested: 'Mencari Driver Terdekat...',
      accepted: 'Driver Menuju Lokasi Penjemputan',
      arrived: 'Driver Sudah Sampai di Titik Jemput',
      on_the_way: 'Dalam Perjalanan Menuju Lokasi Tujuan',
      completed: 'Perjalanan Ojek Telah Selesai',
      cancelled: 'Pemesanan Ojek Dibatalkan'
    };

    addToast('info', 'Status Ojek Diperbarui', rideStatusLabels[newStatus] || 'Status perjalanan telah diperbarui');
  };

  // CHAT HANDLERS
  const handleSendMessage = async (msgData: {
    orderId?: string;
    rideId?: string;
    senderId: string;
    senderName: string;
    senderRole: UserRole;
    receiverId: string;
    receiverName: string;
    receiverRole?: UserRole;
    message: string;
  }) => {
    const newMsg: ChatMessage = {
      id: `50000000-${Date.now().toString().slice(-4)}-4000-8000-${Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0')}`,
      ...msgData,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, newMsg]);

    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_message', data: msgData })
      });
    } catch (e) {
      console.error('Failed to persist message:', e);
    }
  };

  const handleOpenChat = (
    targetUser: { id: string; name: string; role: UserRole; phone?: string; avatar?: string },
    options?: { orderId?: string; rideId?: string; contextTitle?: string }
  ) => {
    setActiveChatTarget({
      targetUser,
      orderId: options?.orderId,
      rideId: options?.rideId,
      contextTitle: options?.contextTitle
    });
  };

  const handleToggleDriverOnline = async (driverId: string) => {
    let nextState = false;
    let targetLat = -6.8155;
    let targetLng = 107.1865;

    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id === driverId) {
          nextState = !d.isOnline;
          targetLat = d.lat;
          targetLng = d.lng;
          addToast(
            nextState ? 'success' : 'warning',
            `Status Driver: ${nextState ? 'ONLINE' : 'OFFLINE'}`,
            nextState ? 'Siap menerima orderan ojek & kurir.' : 'Anda sedang tidak aktif (Icon hilang dari peta).'
          );
          return { ...d, isOnline: nextState };
        }
        return d;
      })
    );

    // Persist online/offline state to Supabase PostgreSQL database
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_driver_location',
          data: {
            driverId,
            lat: targetLat,
            lng: targetLng,
            isOnline: nextState
          }
        })
      });
    } catch (e) {
      console.error('Failed to sync driver online status:', e);
    }
  };

  const handleAddProduct = async (newProd: Omit<Product, 'id'>) => {
    const prodId = `40000000-${Date.now().toString().slice(-4)}-4000-8000-${Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0')}`;
    const created: Product = {
      ...newProd,
      id: prodId
    };
    setProducts((prev) => [created, ...prev]);

    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_product', data: created })
      });
      addToast('success', 'Produk Tersimpan di Database Supabase! 📦', `${created.name} berhasil diterbitkan.`);
    } catch (e) {
      addToast('success', 'Produk Ditambahkan!', `${created.name} berhasil diterbitkan di toko.`);
    }
  };

  const handleToggleProductAvailability = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isAvailable: !p.isAvailable } : p))
    );
    if (selectedProductDetail && selectedProductDetail.id === productId) {
      setSelectedProductDetail((prev) => (prev ? { ...prev, isAvailable: !prev.isAvailable } : null));
    }
  };

  const totalCartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between font-sans transition-colors duration-300">

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      <div>
        {/* Global Header */}
        <Header
          currentRole={currentRole}
          onRoleChange={(r) => {
            setCurrentRole(r);
            setIsLandingActive(false);
            setSelectedProductDetail(null);
          }}
          cartCount={totalCartCount}
          onOpenCart={() => setIsCartOpen(true)}
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
          onGoToLanding={() => {
            if (currentUser) {
              setIsLandingActive(false);
              setSelectedProductDetail(null);
            } else {
              setIsLandingActive(true);
              setSelectedProductDetail(null);
            }
          }}
          isLandingActive={isLandingActive}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenProfile={() => setIsProfileOpen(true)}
        />

        {/* View Switcher: Landing Page vs Dedicated Product Detail Page vs Web App Role Modes */}
        {isLandingActive ? (
          <LandingPage
            onEnterApp={handleEnterApp}
            onOpenAuth={handleOpenAuth}
            storesCount={stores.length}
            productsCount={products.length}
            driversCount={drivers.length}
            ordersCount={orders.length + rides.length}
          />
        ) : selectedProductDetail ? (
          /* DEDICATED PRODUCT DETAIL PAGE VIEW */
          <main className="pb-16">
            <ProductDetailPage
              product={selectedProductDetail}
              store={stores.find((s) => s.id === selectedProductDetail.storeId)}
              currentRole={currentRole}
              reviews={reviews}
              onBack={() => setSelectedProductDetail(null)}
              onAddToCart={handleAddToCart}
              onToggleAvailability={handleToggleProductAvailability}
              onSubmitRating={handleSubmitRating}
              onOpenChat={handleOpenChat}
            />
          </main>
        ) : (
          /* REGULAR ROLE VIEWS */
          <main className="pb-16">
            {currentRole === 'buyer' && (
              <BuyerMode
                stores={stores}
                products={products}
                drivers={drivers}
                orders={orders}
                rides={rides}
                places={places}
                onAddToCart={handleAddToCart}
                onCreateRide={handleCreateRide}
                onSubmitRating={handleSubmitRating}
                savedAddresses={currentUser?.savedAddresses || []}
                onSelectProductDetail={(p) => setSelectedProductDetail(p)}
                onCancelOrder={handleCancelOrder}
                onCancelRide={handleCancelRide}
                onOpenChat={handleOpenChat}
                currentUser={currentUser}
              />
            )}

            {currentRole === 'seller' && (() => {
              const activeStore: Store = (currentUser && stores.find((s) => 
                s.ownerId === currentUser.id || 
                (s.phone && currentUser.phone && s.phone.replace(/[^0-9]/g, '') === currentUser.phone.replace(/[^0-9]/g, ''))
              )) || {
                id: `store-${currentUser?.id || Date.now()}`,
                name: currentUser?.storeName || `Toko UMKM ${currentUser?.name || 'Warga Maleber'}`,
                category: 'Toko Kelontong',
                ownerName: currentUser?.name || 'Pemilik Toko',
                ownerId: currentUser?.id,
                phone: currentUser?.phone || '081234567890',
                address: 'Jl. Raya Maleber No. 12, Kuningan',
                lat: -6.8175,
                lng: 107.1878,
                isActive: true,
                image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
                description: 'Toko UMKM Resmi Desa Maleber',
                rating: 5.0,
                reviewCount: 0
              };
              return (
                <SellerMode
                  store={activeStore}
                  products={products}
                  orders={orders}
                  reviews={reviews}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onAddProduct={handleAddProduct}
                  onToggleProductAvailability={handleToggleProductAvailability}
                  onSelectProduct={(p) => setSelectedProductDetail(p)}
                  onOpenChat={handleOpenChat}
                  onUpdateStore={(updatedStore) => {
                    setStores((prev) => prev.map((s) => (s.id === updatedStore.id ? updatedStore : s)));
                    addToast('success', 'Foto Toko Diperbarui 📸', `Foto banner untuk ${updatedStore.name} telah berhasil diperbarui.`);
                  }}
                  onToggleStoreStatus={(storeId, isActive) => {
                    setStores((prev) =>
                      prev.map((s) => (s.id === storeId ? { ...s, isActive } : s))
                    );
                    fetch('/api/db', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'update_store_status', data: { id: storeId, isActive } })
                    }).catch(() => {});
                    addToast('info', isActive ? 'Toko Berhasil DIBUKA 🟢' : 'Toko Berhasil DITUTUP 🔴', `Status toko Anda di Marketplace Maleber telah diubah.`);
                  }}
                />
              );
            })()}

            {currentRole === 'driver' && (() => {
              const activeDriver: DriverInfo = (currentUser && drivers.find((d) => 
                d.id === currentUser.id || 
                (d.phone && currentUser.phone && d.phone.replace(/[^0-9]/g, '') === currentUser.phone.replace(/[^0-9]/g, ''))
              )) || {
                id: currentUser?.id || `driver-${Date.now()}`,
                name: currentUser?.name || 'Mitra Driver Maleber',
                vehicleModel: currentUser?.vehicleInfo || 'Motor Vario 125',
                vehicleNumber: 'E 4512 YZ',
                phone: currentUser?.phone || '081234567890',
                isOnline: true,
                lat: -6.8170,
                lng: 107.1880,
                rating: 5.0,
                reviewCount: 0
              };
              return (
                <DriverMode
                  driver={activeDriver}
                  rides={rides}
                  orders={orders}
                  reviews={reviews}
                  onToggleOnline={handleToggleDriverOnline}
                  onAcceptRide={handleAcceptRide}
                  onUpdateRideStatus={handleUpdateRideStatus}
                  onAcceptOrderDelivery={handleAcceptOrderDelivery}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onOpenChat={handleOpenChat}
                />
              );
            })()}

            {(currentRole === 'admin' || currentRole === 'superadmin') && (
              <AdminMode
                stores={stores}
                drivers={drivers}
                orders={orders}
                rides={rides}
                places={places}
                users={users}
                resetRequests={resetRequests}
                isPetugasDesa={currentRole === 'admin'}
                onAddStoreByAdmin={(newStore) => {
                  setStores((prev) => [newStore, ...prev]);
                  addToast('success', 'Toko UMKM Terdaftar!', `${newStore.name} berhasil diverifikasi.`);
                  fetch('/api/db', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'create_store', data: newStore })
                  })
                    .then(() => loadLiveSupabaseData())
                    .catch((err) => console.warn('Failed to save store to DB:', err));
                }}
                onAddDriverByAdmin={(newDriver) => {
                  setDrivers((prev) => [newDriver, ...prev]);
                  addToast('success', 'Driver Ojek Terdaftar!', `${newDriver.name} (${newDriver.vehicleNumber}) aktif.`);
                  fetch('/api/db', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'create_driver', data: newDriver })
                  })
                    .then(() => loadLiveSupabaseData())
                    .catch((err) => console.warn('Failed to save driver to DB:', err));
                }}
                onDeleteUserByAdmin={(userId, userEmail) => {
                  const targetUser = users.find((u) => u.id === userId || (userEmail && u.email === userEmail));
                  const targetName = targetUser?.name || '';
                  const targetPhone = targetUser?.phone || '';

                  // 1. Delete user profile
                  setUsers((prev) => prev.filter((u) => u.id !== userId && u.email !== userEmail));

                  // 2. Delete driver standby marker & info
                  setDrivers((prev) => prev.filter((d) => d.id !== userId && d.name !== targetName && d.phone !== targetPhone));

                  // 3. Delete stores & associated products
                  const deletedStoreIds = stores.filter((s) => s.ownerId === userId || s.ownerName === targetName || s.phone === targetPhone).map((s) => s.id);
                  setStores((prev) => prev.filter((s) => s.ownerId !== userId && s.ownerName !== targetName && s.phone !== targetPhone));
                  setProducts((prev) => prev.filter((p) => !deletedStoreIds.includes(p.storeId)));

                  // 4. Delete orders
                  setOrders((prev) => prev.filter((o) => o.buyerId !== userId && o.driverId !== userId && !deletedStoreIds.includes(o.storeId) && o.buyerName !== targetName && o.driverName !== targetName));

                  // 5. Delete rides
                  setRides((prev) => prev.filter((r) => r.passengerId !== userId && r.driverId !== userId && r.passengerName !== targetName && r.driverName !== targetName));

                  // 6. Delete messages
                  setMessages((prev) => prev.filter((m) => m.senderId !== userId && m.receiverId !== userId && m.senderName !== targetName && m.receiverName !== targetName));

                  addToast('info', 'User & Seluruh Data Terkait Dihapus 🗑️', `Akun, marker driver standby, toko, dan order milik user telah dibersihkan.`);
                }}
                onSwitchRoleView={(r) => {
                  setCurrentRole(r);
                  setSelectedProductDetail(null);
                  addToast('info', 'Super Admin View Inspector', `Melihat tampilan sebagai ${r.toUpperCase()}`);
                }}
                onRefreshData={loadLiveSupabaseData}
              />
            )}
          </main>
        )}
      </div>

      {/* Global Footer */}
      <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 py-6 px-4 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; 2026 Pemerintah Desa Maleber &bull; KKN 190 UIN SGD x UIN GUSDUR</p>
          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => {
                setLegalTab('privacy');
                setIsLegalOpen(true);
              }}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors underline-offset-4 hover:underline"
            >
              Kebijakan Privasi
            </button>
            <span>&bull;</span>
            <button
              onClick={() => {
                setLegalTab('terms');
                setIsLegalOpen(true);
              }}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors underline-offset-4 hover:underline"
            >
              Syarat & Ketentuan
            </button>
          </div>
        </div>
      </footer>

      {/* Legal Privacy & Terms Modal */}
      <LegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        initialTab={legalTab}
      />

      {/* Cart Modal */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        savedAddresses={currentUser?.savedAddresses || []}
        onUpdateCartQty={handleUpdateCartQty}
        onClearCart={handleClearCart}
        onCheckout={handleCreateOrder}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authInitialMode}
        initialRole={authInitialRole}
        onAuthSuccess={handleAuthSuccess}
        users={users}
      />

      {/* Profile Modal */}
      {currentUser && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={currentUser}
          onSaveProfile={handleSaveProfile}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      )}

      {/* Chat Modal */}
      {activeChatTarget && (
        <ChatModal
          isOpen={true}
          onClose={() => setActiveChatTarget(null)}
          currentUser={currentUser}
          targetUser={activeChatTarget.targetUser}
          contextTitle={activeChatTarget.contextTitle}
          orderId={activeChatTarget.orderId}
          rideId={activeChatTarget.rideId}
          messages={messages}
          onSendMessage={handleSendMessage}
        />
      )}

    </div>
  );
}
