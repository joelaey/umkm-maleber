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
import ToastContainer, { ToastMessage, ToastType } from '@/components/Toast';

import { UserRole, UserProfile, Store, Product, CartItem, Order, RideRequest, DriverInfo, ChatMessage, Review, PlacePOI } from '@/types';
import { triggerSystemNotification } from '@/lib/notificationUtils';
import {
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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

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

  // Toggle Dark/Light Theme
  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    // Default to dark theme for rich aesthetics
    document.documentElement.classList.add('dark');
  }, []);

  // Application Data State (Will be loaded from Supabase PostgreSQL live)
  const [stores, setStores] = useState<Store[]>(INITIAL_STORES);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [drivers, setDrivers] = useState<DriverInfo[]>(INITIAL_DRIVERS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [rides, setRides] = useState<RideRequest[]>(INITIAL_RIDES);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [places, setPlaces] = useState<PlacePOI[]>(INITIAL_PLACES);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

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
        if (data.stores && data.stores.length > 0) setStores(data.stores);
        if (data.products && data.products.length > 0) setProducts(data.products);
        if (data.drivers && data.drivers.length > 0) setDrivers(data.drivers);
        if (data.orders) setOrders(data.orders);
        if (data.rides) setRides(data.rides);
        if (data.reviews && data.reviews.length > 0) setReviews(data.reviews);
        if (data.messages) setMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to load live data from Supabase DB:', err);
    }
  };

  useEffect(() => {
    loadLiveSupabaseData();
    const interval = setInterval(() => {
      loadLiveSupabaseData();
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Auth & Profile User State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [authInitialRole, setAuthInitialRole] = useState<UserRole>('buyer');

  const handleSaveProfile = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('maleber_user', JSON.stringify(updatedUser));
    addToast('success', 'Profil & Alamat Terperbarui! 👤', 'Data profil & daftar alamat favorit Anda tersimpan.');
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
  const handleAddToCart = (product: Product, quantity = 1, notes?: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id && item.notes === notes);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && item.notes === notes
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity, notes }];
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

  // CREATE FOOD ORDER (WRITES DIRECTLY TO SUPABASE POSTGRESQL ORDERS TABLE)
  const handleCreateOrder = async (deliveryAddress: string, lat: number, lng: number) => {
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
      totalAmount: subtotal + 5000,
      deliveryFee: 5000,
      status: 'pending',
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

    // Write row directly into Supabase PostgreSQL orders table
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_order', data: newOrder })
      });
      const resData = await res.json();
      if (resData.success) {
        addToast('success', 'Pesanan Berhasil Dikirim! 🍽️', `Toko ${newOrder.storeName} telah menerima pesanan Anda.`);
      } else {
        addToast('success', 'Pesanan Berhasil Dikirim! 🍽️', `Toko ${newOrder.storeName} telah menerima pesanan Anda.`);
      }
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
    fare: number
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
      createdAt: new Date().toISOString()
    };

    setRides((prev) => [newRide, ...prev]);

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_ride', data: newRide })
      });
      const resData = await res.json();
      if (resData.success) {
        addToast('success', 'Ojek Berhasil Dipesan! 🛵', `Tarif: Rp ${fare.toLocaleString('id-ID')}. Mencari driver terdekat...`);
      } else {
        addToast('success', 'Ojek Berhasil Dipesan! 🛵', `Tarif: Rp ${fare.toLocaleString('id-ID')}. Mencari driver terdekat...`);
      }
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
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === targetId) {
            const updatedRating = Math.round((((p.rating || 4.8) + newRating) / 2) * 10) / 10;
            return { ...p, rating: updatedRating };
          }
          return p;
        })
      );
      addToast('success', 'Ulasan Berhasil Terkirim! ⭐', 'Terima kasih atas penilaian dan ulasan Anda.');
    } else if (targetType === 'store') {
      setStores((prev) =>
        prev.map((s) => {
          if (s.id === targetId) {
            const count = (s.reviewCount || 1) + 1;
            const updatedRating = Math.round(((s.rating + newRating) / 2) * 10) / 10;
            return { ...s, rating: updatedRating, reviewCount: count };
          }
          return s;
        })
      );
      addToast('success', 'Ulasan Warung Terkirim! ⭐', 'Terima kasih telah mendukung UMKM Desa Maleber.');
    } else {
      setDrivers((prev) =>
        prev.map((d) => {
          if (d.id === targetId) {
            const count = (d.reviewCount || 1) + 1;
            const updatedRating = Math.round(((d.rating + newRating) / 2) * 10) / 10;
            return { ...d, rating: updatedRating, reviewCount: count };
          }
          return d;
        })
      );
      addToast('success', 'Ulasan Driver Terkirim! ⭐ 🛵', 'Terima kasih atas penilaian Anda untuk Mitra Driver.');
    }
  };

  // ORDER STATUS HANDLERS
  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
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

  const handleToggleDriverOnline = (driverId: string) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id === driverId) {
          const nextState = !d.isOnline;
          addToast(nextState ? 'success' : 'warning', `Status Driver: ${nextState ? 'ONLINE' : 'OFFLINE'}`, nextState ? 'Siap menerima orderan ojek & kurir.' : 'Anda sedang tidak aktif.');
          return { ...d, isOnline: nextState };
        }
        return d;
      })
    );
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
            ordersCount={orders.length}
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
              />
            )}

            {currentRole === 'seller' && (() => {
              const activeStore: Store = (currentUser && stores.find((s) => 
                s.ownerId === currentUser.id || 
                (currentUser.storeName && s.name.toLowerCase().includes(currentUser.storeName.toLowerCase())) || 
                s.ownerName.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0]) ||
                currentUser.name.toLowerCase().includes(s.ownerName.toLowerCase().split(' ')[0])
              )) || stores[0];
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
                />
              );
            })()}

            {currentRole === 'driver' && (() => {
              const activeDriver: DriverInfo = (currentUser && drivers.find((d) => 
                d.id === currentUser.id || 
                d.name.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[1]?.toLowerCase() || 'xyz') ||
                currentUser.name.toLowerCase().includes(d.name.toLowerCase().split(' ')[1]?.toLowerCase() || 'xyz')
              )) || {
                id: currentUser?.id || 'c2222222-2222-4222-8222-222222222222',
                name: currentUser?.name || 'Kang Dede Ojek Desa',
                vehicleModel: currentUser?.vehicleInfo || 'Yamaha NMAX 155',
                vehicleNumber: 'F 3312 WX',
                phone: currentUser?.phone || '082198765433',
                isOnline: true,
                lat: -6.8170,
                lng: 107.1880,
                rating: currentUser?.rating || 4.90,
                reviewCount: 64
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

            {currentRole === 'admin' && (
              <AdminMode
                stores={stores}
                drivers={drivers}
                orders={orders}
                rides={rides}
                places={places}
                onAddStoreByAdmin={(newStore) => {
                  setStores((prev) => [newStore, ...prev]);
                  addToast('success', 'Toko UMKM Terdaftar!', `${newStore.name} berhasil diverifikasi.`);
                }}
                onAddDriverByAdmin={(newDriver) => {
                  setDrivers((prev) => [newDriver, ...prev]);
                  addToast('success', 'Driver Ojek Terdaftar!', `${newDriver.name} (${newDriver.vehicleNumber}) aktif.`);
                }}
                onSwitchRoleView={(r) => {
                  setCurrentRole(r);
                  setSelectedProductDetail(null);
                  addToast('info', 'Super Admin View Inspector', `Melihat tampilan sebagai ${r.toUpperCase()}`);
                }}
              />
            )}
          </main>
        )}
      </div>

      {/* Global Footer */}
      <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs font-bold text-zinc-500 dark:text-zinc-400">
        <p>&copy; 2026 KKN 190 UIN SGD X UIN GUSDUR MALEBER</p>
      </footer>

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
