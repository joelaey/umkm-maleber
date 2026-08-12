import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/cryptoUtils';

function parseUuidOrNull(val: any) {
  if (typeof val !== 'string') return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(val) ? val : null;
}

let isDbInitialized = false;

async function ensureDbInitialized() {
  try {
    await queryDb(`
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'buyer',
        avatar TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT;
      ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
      ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
      ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_buyer_id_fkey;
      ALTER TABLE public.ride_requests DROP CONSTRAINT IF EXISTS ride_requests_passenger_id_fkey;
      ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'qris';
      ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
      ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;

      ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'qris';
      ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
      ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;

      ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
      ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS receiver_role TEXT;

      CREATE TABLE IF NOT EXISTS public.stores (
        id TEXT PRIMARY KEY,
        owner_id TEXT,
        name TEXT NOT NULL,
        category TEXT,
        address TEXT,
        lat NUMERIC,
        lng NUMERIC,
        owner_name TEXT,
        phone TEXT,
        rating NUMERIC DEFAULT 5.0,
        review_count INT DEFAULT 1,
        image TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS owner_name TEXT;
      ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS image TEXT;
      ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5.0;
      ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 1;

      CREATE TABLE IF NOT EXISTS public.driver_locations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        lat NUMERIC DEFAULT -6.8155,
        lng NUMERIC DEFAULT 107.1865,
        is_online BOOLEAN DEFAULT TRUE,
        rating NUMERIC DEFAULT 5.0,
        review_count INT DEFAULT 1,
        vehicle_model TEXT DEFAULT 'Honda Beat Hitam',
        vehicle_number TEXT DEFAULT 'F 1234 MBR',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS name TEXT;
      ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS lat NUMERIC DEFAULT -6.8155;
      ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS lng NUMERIC DEFAULT 107.1865;
      ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT TRUE;
      ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS vehicle_model TEXT;
      ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS vehicle_number TEXT;
      ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5.0;
      ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 1;
      ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

      CREATE TABLE IF NOT EXISTS public.driver_vehicles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        driver_id TEXT UNIQUE NOT NULL,
        vehicle_model TEXT NOT NULL,
        vehicle_number TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.reset_requests (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id TEXT,
        user_name TEXT,
        user_email TEXT,
        user_phone TEXT,
        reason TEXT,
        status TEXT DEFAULT 'pending',
        admin_reply TEXT,
        new_password_set TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      UPDATE public.profiles SET role = 'superadmin' WHERE (email = 'superadmin@maleber.des.id' OR email = 'j@superadmin.com') AND role != 'superadmin';
      INSERT INTO public.profiles (id, name, email, phone, password, role)
      VALUES (
        'a1111111-1111-4111-8111-111111111112',
        'super admin j.',
        'j@superadmin.com',
        NULL,
        '${hashPassword('a11101977')}',
        'superadmin'
      )
      ON CONFLICT (email) DO UPDATE SET
        name = 'super admin j.',
        role = 'superadmin',
        password = EXCLUDED.password;

      -- Clean up legacy hardcoded dummy stores & drivers so database is 100% real
      DELETE FROM public.stores WHERE id IN ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333');
      DELETE FROM public.driver_locations WHERE id IN ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'c2222222-2222-4222-8222-222222222222', 'c3333333-3333-4333-8333-333333333333');

      -- Auto-prune orders, rides, and messages older than 30 days
      DELETE FROM public.orders WHERE created_at < NOW() - INTERVAL '30 days';
      DELETE FROM public.ride_requests WHERE created_at < NOW() - INTERVAL '30 days';
      DELETE FROM public.messages WHERE created_at < NOW() - INTERVAL '30 days';

      -- Sync any registered profiles with role = 'driver' to public.driver_locations if missing
      INSERT INTO public.driver_locations (id, name, driver_name, phone, lat, lng, is_online, rating, review_count, vehicle_model, vehicle_number)
      SELECT id, name, name, COALESCE(phone, '081234567890'), -6.8155, 107.1865, TRUE, 5.0, 1, 'Motor Ojek Maleber', 'F 1000 MBR'
      FROM public.profiles
      WHERE role = 'driver'
      ON CONFLICT (id) DO NOTHING;

      -- Sync any registered profiles with role = 'seller' to public.stores if missing
      INSERT INTO public.stores (id, owner_id, name, category, address, lat, lng, owner_name, phone, rating, review_count, image, is_active, description)
      SELECT id, id, concat('Warung ', name), 'Kuliner', 'Desa Maleber, Karangtengah', -6.8155, 107.1865, name, COALESCE(phone, '081234567890'), 5.0, 1, 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80', TRUE, 'Toko UMKM Desa Maleber'
      FROM public.profiles
      WHERE role = 'seller'
      ON CONFLICT (id) DO NOTHING;
    `);
    isDbInitialized = true;
  } catch (e: any) {
    console.error('Profiles & Orders table init notice:', e.message);
  }
}

export async function GET() {
  try {
    await ensureDbInitialized();

    // Fast parallel execution of all SELECT queries via Promise.all
    const [
      profilesRes,
      storesRes,
      driversRes,
      productsRes,
      driverVehiclesRes,
      ordersRes,
      ridesRes,
      reviewsRes,
      messagesRes,
      resetRequestsRes
    ] = await Promise.all([
      queryDb('SELECT * FROM public.profiles ORDER BY created_at DESC').catch(() => queryDb('SELECT * FROM public.profiles')).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM public.stores ORDER BY created_at DESC').catch(() => queryDb('SELECT * FROM public.stores')).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM public.driver_locations ORDER BY updated_at DESC').catch(() => queryDb('SELECT * FROM public.driver_locations')).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM public.products ORDER BY created_at DESC').catch(() => queryDb('SELECT * FROM public.products')).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM public.driver_vehicles').catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM public.orders ORDER BY created_at DESC').catch(() => queryDb('SELECT * FROM public.orders')).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM public.ride_requests ORDER BY created_at DESC').catch(() => queryDb('SELECT * FROM public.ride_requests')).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM public.reviews ORDER BY created_at DESC').catch(() => queryDb('SELECT * FROM public.reviews')).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM public.messages ORDER BY created_at ASC').catch(() => queryDb('SELECT * FROM public.messages')).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM public.reset_requests ORDER BY created_at DESC').catch(() => ({ rows: [] }))
    ]);

    const users = profilesRes.rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      password: u.password,
      role: u.email === 'superadmin@maleber.des.id' ? 'superadmin' : (u.role || 'buyer'),
      avatar: u.avatar || ''
    }));

    const stores = storesRes.rows.map((s) => ({
      id: s.id,
      ownerId: s.owner_id || 'usr-seller-1',
      name: s.name,
      category: s.category,
      address: s.address,
      lat: Number(s.lat),
      lng: Number(s.lng),
      ownerName: s.owner_name,
      phone: s.phone,
      rating: Number(s.rating) || 5.0,
      reviewCount: s.review_count || 1,
      image: s.image,
      isActive: s.is_active ?? true,
      description: s.description
    }));

    const products = productsRes.rows.map((p) => ({
      id: p.id,
      storeId: p.store_id,
      name: p.name,
      price: Number(p.price),
      description: p.description,
      ingredients: p.ingredients || [],
      category: p.category,
      image: p.image,
      images: p.images || [p.image],
      isAvailable: p.is_available ?? true,
      unit: p.unit || 'porsi',
      rating: Number(p.rating) || 0,
      salesCount: p.sales_count || 0
    }));

    const drivers = driversRes.rows.map((d) => {
      const v = driverVehiclesRes.rows.find((veh: any) => veh.driver_id === d.id);
      return {
        id: d.id,
        name: d.name || d.driver_name || 'Driver Ojek Maleber',
        phone: d.phone || '081234567890',
        vehicleNumber: v ? v.vehicle_number : (d.vehicle_number || 'F 1234 MBR'),
        vehicleModel: v ? v.vehicle_model : (d.vehicle_model || 'Motor Ojek Maleber'),
        isOnline: d.is_online ?? true,
        lat: Number(d.lat) && !isNaN(Number(d.lat)) ? Number(d.lat) : -6.8155,
        lng: Number(d.lng) && !isNaN(Number(d.lng)) ? Number(d.lng) : 107.1865,
        rating: Number(d.rating) || 5.0,
        reviewCount: Number(d.review_count) || 1
      };
    });

    const orders = ordersRes.rows.map((o) => ({
      id: o.id,
      buyerId: o.buyer_id || 'usr-buyer-1',
      buyerName: o.buyer_name,
      buyerPhone: o.buyer_phone,
      storeId: o.store_id,
      storeName: o.store_name,
      driverId: o.driver_id,
      driverName: o.driver_name,
      items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
      totalAmount: Number(o.total_amount),
      deliveryFee: Number(o.delivery_fee) || 5000,
      status: o.status,
      paymentMethod: o.payment_method || 'qris',
      paymentStatus: o.payment_status || (o.is_paid ? 'paid' : 'unpaid'),
      isPaid: o.is_paid ?? (o.payment_status === 'paid'),
      deliveryAddress: o.delivery_address,
      lat: Number(o.lat),
      lng: Number(o.lng),
      createdAt: o.created_at
    }));

    const rides = ridesRes.rows.map((r) => ({
      id: r.id,
      passengerId: r.passenger_id || 'usr-buyer-1',
      passengerName: r.passenger_name,
      passengerPhone: r.passenger_phone,
      driverId: r.driver_id,
      driverName: r.driver_name,
      pickupAddress: r.pickup_address,
      pickupLat: Number(r.pickup_lat),
      pickupLng: Number(r.pickup_lng),
      destAddress: r.dest_address,
      destLat: Number(r.dest_lat),
      destLng: Number(r.dest_lng),
      distanceKm: Number(r.distance_km),
      fare: Number(r.fare),
      status: r.status,
      paymentMethod: r.payment_method || 'qris',
      paymentStatus: r.payment_status || (r.is_paid ? 'paid' : 'unpaid'),
      isPaid: r.is_paid ?? (r.payment_status === 'paid'),
      createdAt: r.created_at
    }));

    const messages = messagesRes.rows.map((m) => ({
      id: m.id,
      orderId: m.order_id,
      rideId: m.ride_id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      senderRole: m.sender_role,
      receiverId: m.receiver_id,
      receiverName: m.receiver_name,
      receiverRole: m.receiver_role || undefined,
      message: m.message,
      isRead: m.is_read ?? false,
      createdAt: m.created_at
    }));

    const reviews = reviewsRes.rows.map((r) => ({
      id: r.id,
      targetId: r.target_id,
      targetType: r.target_type,
      userId: r.user_id,
      userName: r.user_name,
      rating: Number(r.rating) || 5,
      comment: r.comment || '',
      createdAt: r.created_at
    }));

    const resetRequests = resetRequestsRes.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      userEmail: r.user_email,
      userPhone: r.user_phone,
      reason: r.reason,
      status: r.status || 'pending',
      adminReply: r.admin_reply,
      newPasswordSet: r.new_password_set,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return NextResponse.json({
      success: true,
      users,
      stores,
      products,
      drivers,
      orders,
      rides,
      reviews,
      messages,
      resetRequests
    });
  } catch (error: any) {
    console.error('API GET /api/db error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, data } = body;

    if (action === 'register_user') {
      const { id, name, email, phone, password, role, avatar } = data;
      const validUserId = parseUuidOrNull(id) || `a0000000-${Date.now().toString().slice(-4)}-4000-8000-${Math.floor(Math.random()*1000000000000).toString().padStart(12, '0')}`;
      const encryptedPassword = password ? hashPassword(password) : null;

      const res = await queryDb(
        `INSERT INTO public.profiles (id, name, email, phone, password, role, avatar)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           phone = EXCLUDED.phone,
           password = EXCLUDED.password,
           avatar = EXCLUDED.avatar
         RETURNING *`,
        [validUserId, name, email || null, phone || null, encryptedPassword, role || 'buyer', avatar || null]
      );

      console.log('API POST SUCCESS: Registered user with encrypted password in Supabase profiles:', res.rows[0]);
      return NextResponse.json({ success: true, user: res.rows[0] });
    }

    if (action === 'request_password_reset') {
      const { userId, userEmail, userPhone, userName, reason } = data;
      const cleanEmail = (userEmail || '').trim().toLowerCase();
      const cleanPhone = (userPhone || '').replace(/[^0-9]/g, '');
      
      // Attempt to find matching profile in PostgreSQL profiles
      const findProfileRes = await queryDb(
        `SELECT * FROM public.profiles WHERE (email IS NOT NULL AND LOWER(email) = LOWER($1)) OR (phone IS NOT NULL AND REPLACE(phone, ' ', '') LIKE $2) OR id = $3 LIMIT 1`,
        [cleanEmail || '___none___', cleanPhone ? `%${cleanPhone}%` : '___none___', userId || 'a0000000-0000-0000-0000-000000000000']
      ).catch(() => ({ rows: [] }));

      const matchedProfile = findProfileRes.rows[0];

      // If account is not found in DB and no verified client userName was provided
      if (!matchedProfile && !userName) {
        return NextResponse.json({
          success: false,
          error: 'Akun email atau nomor WhatsApp tidak terdaftar di sistem Desa Maleber. Silakan periksa kembali!'
        }, { status: 400 });
      }

      const res = await queryDb(
        `INSERT INTO public.reset_requests (user_id, user_name, user_email, user_phone, reason, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING *`,
        [
          matchedProfile ? matchedProfile.id : userId,
          matchedProfile ? matchedProfile.name : userName,
          matchedProfile ? matchedProfile.email : (cleanEmail || null),
          matchedProfile ? matchedProfile.phone : (cleanPhone || null),
          reason || 'Permintaan reset kata sandi dari user'
        ]
      );

      console.log('API POST SUCCESS: Created password reset request for verified user:', res.rows[0]);
      return NextResponse.json({ success: true, resetRequest: res.rows[0] });
    }

    if (action === 'resolve_password_reset') {
      const { requestId, userId, userEmail, userPhone, newPassword, adminReply } = data;
      const encryptedNewPassword = hashPassword(newPassword);

      // 1. Update Profile Password in DB with encrypted password
      if (userId) {
        const validUuid = parseUuidOrNull(userId);
        if (validUuid) {
          await queryDb(`UPDATE public.profiles SET password = $1 WHERE id = $2`, [encryptedNewPassword, validUuid]).catch(() => {});
        }
      }
      if (userEmail) {
        await queryDb(`UPDATE public.profiles SET password = $1 WHERE LOWER(email) = LOWER($2)`, [encryptedNewPassword, userEmail]).catch(() => {});
      }
      if (userPhone) {
        await queryDb(`UPDATE public.profiles SET password = $1 WHERE phone = $2`, [encryptedNewPassword, userPhone]).catch(() => {});
      }

      // 2. Update reset_requests status
      const validReqId = parseUuidOrNull(requestId);
      if (validReqId) {
        await queryDb(
          `UPDATE public.reset_requests SET status = 'resolved', admin_reply = $1, new_password_set = $2, updated_at = NOW() WHERE id = $3`,
          [adminReply || `Kata sandi Anda telah berhasil di-reset oleh Super Admin menjadi: ${newPassword}`, newPassword, validReqId]
        ).catch(() => {});
      }

      // 3. Send automated system reply message to user chat inbox
      if (userId || userEmail) {
        const validMsgId = `a0000000-${Date.now().toString().slice(-4)}-4000-8000-${Math.floor(Math.random()*1000000000000).toString().padStart(12, '0')}`;
        await queryDb(
          `INSERT INTO public.messages (id, sender_id, sender_name, sender_role, receiver_id, receiver_name, message, is_read)
           VALUES ($1, $2, $3, $4, $5, $6, $7, false)`,
          [
            validMsgId,
            'usr-superadmin',
            'Super Admin Maleber',
            'superadmin',
            userId || 'usr-buyer-1',
            userEmail || 'User Warga',
            `🔑 Balasan Laporan Reset Password: ${adminReply || `Kata sandi baru Anda: ${newPassword}`}`
          ]
        ).catch(() => {});
      }

      console.log('API POST SUCCESS: Resolved password reset request for user:', userEmail || userId);
      return NextResponse.json({ success: true });
    }

    if (action === 'create_order') {
      const {
        id,
        buyerId,
        buyerName,
        buyerPhone,
        storeId,
        storeName,
        items,
        totalAmount,
        deliveryFee,
        status,
        paymentMethod,
        paymentStatus,
        deliveryAddress,
        lat,
        lng
      } = data;

      const validOrderId = parseUuidOrNull(id) || `10000000-${Date.now().toString().slice(-4)}-4000-8000-${Math.floor(Math.random()*1000000000000).toString().padStart(12, '0')}`;
      const validBuyerId = parseUuidOrNull(buyerId);
      const validStoreId = parseUuidOrNull(storeId);
      const isPaidBool = paymentStatus === 'paid';

      await queryDb(`
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'qris';
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
      `).catch(() => {});

      const res = await queryDb(
        `INSERT INTO public.orders (id, buyer_id, buyer_name, buyer_phone, store_id, store_name, items, total_amount, delivery_fee, status, payment_method, payment_status, is_paid, delivery_address, lat, lng)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING *`,
        [
          validOrderId,
          validBuyerId,
          buyerName || 'Warga Maleber',
          buyerPhone || '081234567890',
          validStoreId,
          storeName || 'Warung UMKM Maleber',
          JSON.stringify(items || []),
          totalAmount || 0,
          deliveryFee || 5000,
          status || 'pending',
          paymentMethod || 'qris',
          paymentStatus || 'unpaid',
          isPaidBool,
          deliveryAddress || 'Desa Maleber',
          lat || -6.8155,
          lng || 107.1865
        ]
      );

      console.log('API POST SUCCESS: Inserted order with is_paid into Supabase!', res.rows[0]);
      return NextResponse.json({ success: true, order: res.rows[0] });
    }

    if (action === 'create_ride') {
      const {
        id,
        passengerId,
        passengerName,
        passengerPhone,
        pickupAddress,
        pickupLat,
        pickupLng,
        destAddress,
        destLat,
        destLng,
        distanceKm,
        fare,
        status,
        paymentMethod,
        paymentStatus
      } = data;

      const validRideId = parseUuidOrNull(id) || `20000000-${Date.now().toString().slice(-4)}-4000-8000-${Math.floor(Math.random()*1000000000000).toString().padStart(12, '0')}`;
      const validPassengerId = parseUuidOrNull(passengerId);
      const isPaidBool = paymentStatus === 'paid';

      await queryDb(`
        ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'qris';
        ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
        ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
      `).catch(() => {});

      const res = await queryDb(
        `INSERT INTO public.ride_requests (id, passenger_id, passenger_name, passenger_phone, pickup_address, pickup_lat, pickup_lng, dest_address, dest_lat, dest_lng, distance_km, fare, status, payment_method, payment_status, is_paid)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING *`,
        [
          validRideId,
          validPassengerId,
          passengerName || 'Warga Maleber',
          passengerPhone || '081234567890',
          pickupAddress || 'Kantor Desa Maleber',
          pickupLat || -6.8155,
          pickupLng || 107.1865,
          destAddress || 'Simpang Maleber',
          destLat || -6.8110,
          destLng || 107.1890,
          distanceKm || 1.0,
          fare || 6000,
          status || 'requested',
          paymentMethod || 'qris',
          paymentStatus || 'unpaid',
          isPaidBool
        ]
      );

      console.log('API POST SUCCESS: Inserted ride request with is_paid into Supabase!', res.rows[0]);
      return NextResponse.json({ success: true, ride: res.rows[0] });
    }

    if (action === 'submit_review') {
      const { id, targetId, targetType, userId, userName, rating, comment } = data;
      const validRevId = parseUuidOrNull(id) || `30000000-${Date.now().toString().slice(-4)}-4000-8000-${Math.floor(Math.random()*1000000000000).toString().padStart(12, '0')}`;
      const validTargetId = parseUuidOrNull(targetId) || targetId;
      const validUserId = parseUuidOrNull(userId);

      const res = await queryDb(
        `INSERT INTO public.reviews (id, target_id, target_type, user_id, user_name, rating, comment)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          validRevId,
          validTargetId,
          targetType || 'store',
          validUserId,
          userName || 'Warga Maleber',
          rating || 5,
          comment || ''
        ]
      );

      // Update rating in target table if target_id is valid UUID
      if (targetType === 'driver' && parseUuidOrNull(validTargetId)) {
        await queryDb(
          `UPDATE public.driver_locations SET rating = $1 WHERE id = $2`,
          [rating || 5, validTargetId]
        ).catch(() => {});
      } else if (targetType === 'store' && parseUuidOrNull(validTargetId)) {
        await queryDb(
          `UPDATE public.stores SET rating = $1, review_count = COALESCE(review_count, 0) + 1 WHERE id = $2`,
          [rating || 5, validTargetId]
        ).catch(() => {});
      }

      const inserted = res.rows[0];
      const review = {
        id: inserted.id,
        targetId: inserted.target_id,
        targetType: inserted.target_type,
        userId: inserted.user_id,
        userName: inserted.user_name,
        rating: Number(inserted.rating) || 5,
        comment: inserted.comment || '',
        createdAt: inserted.created_at
      };

      return NextResponse.json({ success: true, review });
    }

    if (action === 'update_order_status') {
      const { orderId, status, driverId, driverName, cancelReason } = data;
      const validOrderId = parseUuidOrNull(orderId) || orderId;
      const validDriverId = parseUuidOrNull(driverId);

      try {
        await queryDb(`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT`).catch(() => {});
        if (validDriverId) {
          await queryDb(
            `UPDATE public.orders SET status = $1, driver_id = $2, driver_name = $3 WHERE id = $4`,
            [status, validDriverId, driverName, validOrderId]
          );
        } else if (cancelReason) {
          await queryDb(`UPDATE public.orders SET status = $1, cancel_reason = $2 WHERE id = $3`, [status, cancelReason, validOrderId])
            .catch(async () => {
              await queryDb(`UPDATE public.orders SET status = $1 WHERE id = $2`, [status, validOrderId]);
            });
        } else {
          await queryDb(`UPDATE public.orders SET status = $1 WHERE id = $2`, [status, validOrderId]);
        }

        if (status === 'completed' || status === 'cancelled') {
          await queryDb(`DELETE FROM public.messages WHERE order_id = $1`, [validOrderId]).catch(() => {});
        }
      } catch (e: any) {
        console.warn('Order status update notice:', e.message);
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'update_ride_status') {
      const { rideId, status, driverId, driverName, cancelReason } = data;
      const validRideId = parseUuidOrNull(rideId) || rideId;
      const validDriverId = parseUuidOrNull(driverId);

      try {
        await queryDb(`ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS cancel_reason TEXT`).catch(() => {});
        if (validDriverId) {
          await queryDb(
            `UPDATE public.ride_requests SET status = $1, driver_id = $2, driver_name = $3 WHERE id = $4`,
            [status, validDriverId, driverName, validRideId]
          );
        } else if (cancelReason) {
          await queryDb(`UPDATE public.ride_requests SET status = $1, cancel_reason = $2 WHERE id = $3`, [status, cancelReason, validRideId])
            .catch(async () => {
              await queryDb(`UPDATE public.ride_requests SET status = $1 WHERE id = $2`, [status, validRideId]);
            });
        } else {
          await queryDb(`UPDATE public.ride_requests SET status = $1 WHERE id = $2`, [status, validRideId]);
        }

        if (status === 'completed' || status === 'cancelled') {
          await queryDb(`DELETE FROM public.messages WHERE ride_id = $1`, [validRideId]).catch(() => {});
        }
      } catch (e: any) {
        console.warn('Ride status update notice:', e.message);
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'add_product') {
      const { id, storeId, name, price, description, ingredients, category, image, images, isAvailable, unit } = data;
      const validProdId = parseUuidOrNull(id) || `b${Date.now().toString().slice(-7)}-4000-8000-${Math.floor(Math.random()*1000000000000).toString().padStart(12, '0')}`;
      const validStoreId = parseUuidOrNull(storeId) || '11111111-1111-4111-8111-111111111111';

      await queryDb(
        `INSERT INTO public.products (id, store_id, name, price, description, ingredients, category, image, images, is_available, unit)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          validProdId,
          validStoreId,
          name,
          price,
          description,
          ingredients || [],
          category,
          image,
          images || [image],
          isAvailable ?? true,
          unit || 'porsi'
        ]
      );
      return NextResponse.json({ success: true });
    }

    if (action === 'send_message') {
      const { id, orderId, rideId, senderId, senderName, senderRole, receiverId, receiverName, receiverRole, message } = data;
      const validMsgId = parseUuidOrNull(id) || `50000000-${Date.now().toString().slice(-4)}-4000-8000-${Math.floor(Math.random()*1000000000000).toString().padStart(12, '0')}`;

      await queryDb(`ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;`).catch(() => {});
      await queryDb(`ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS receiver_role TEXT;`).catch(() => {});

      const res = await queryDb(
        `INSERT INTO public.messages (id, order_id, ride_id, sender_id, sender_name, sender_role, receiver_id, receiver_name, receiver_role, message, is_read)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE)
         RETURNING *`,
        [
          validMsgId,
          orderId || null,
          rideId || null,
          senderId || 'usr-anon',
          senderName || 'Warga Maleber',
          senderRole || 'buyer',
          receiverId || 'usr-target',
          receiverName || 'Mitra Maleber',
          receiverRole || null,
          message || ''
        ]
      );
      return NextResponse.json({ success: true, message: res.rows[0] });
    }

    if (action === 'mark_messages_read') {
      const { orderId, rideId, currentUserId } = data;
      await queryDb(`ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;`).catch(() => {});
      if (orderId) {
        await queryDb(`UPDATE public.messages SET is_read = TRUE WHERE order_id = $1 AND sender_id != $2`, [orderId, currentUserId]).catch(() => {});
      } else if (rideId) {
        await queryDb(`UPDATE public.messages SET is_read = TRUE WHERE ride_id = $1 AND sender_id != $2`, [rideId, currentUserId]).catch(() => {});
      } else if (currentUserId) {
        await queryDb(`UPDATE public.messages SET is_read = TRUE WHERE receiver_id = $1`, [currentUserId]).catch(() => {});
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'update_driver_location') {
      const { driverId, lat, lng, isOnline } = data;
      const validDriverId = parseUuidOrNull(driverId) || driverId;

      if (validDriverId) {
        await queryDb(
          `UPDATE public.driver_locations SET lat = $1, lng = $2, is_online = COALESCE($3, is_online), updated_at = NOW() WHERE id = $4`,
          [lat, lng, isOnline, validDriverId]
        ).catch(() => {});
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'update_driver_vehicle') {
      const { driverId, vehicleInfo, vehicleModel, vehicleNumber } = data;
      const validDriverId = parseUuidOrNull(driverId) || driverId;

      await queryDb(`
        CREATE TABLE IF NOT EXISTS public.driver_vehicles (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          driver_id TEXT UNIQUE NOT NULL,
          vehicle_model TEXT NOT NULL,
          vehicle_number TEXT NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `).catch(() => {});

      if (validDriverId) {
        await queryDb(
          `INSERT INTO public.driver_vehicles (driver_id, vehicle_model, vehicle_number, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (driver_id) DO UPDATE 
           SET vehicle_model = EXCLUDED.vehicle_model, vehicle_number = EXCLUDED.vehicle_number, updated_at = NOW()`,
          [validDriverId, vehicleModel || vehicleInfo, vehicleNumber || 'F 3312 WX']
        ).catch(() => {});

        await queryDb(
          `UPDATE public.driver_locations SET vehicle_model = $1, vehicle_number = $2 WHERE id = $3`,
          [vehicleModel || vehicleInfo, vehicleNumber || 'F 3312 WX', validDriverId]
        ).catch(() => {});
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'update_store_status') {
      const { id, isActive } = data;
      const validStoreId = parseUuidOrNull(id) || id;

      if (validStoreId) {
        await queryDb(
          `UPDATE public.stores SET is_active = $1 WHERE id = $2`,
          [isActive, validStoreId]
        ).catch(() => {});
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'create_profile') {
      const { id, name, email, phone, role, password, avatar } = data;
      const validId = parseUuidOrNull(id) || `00000000-0000-4000-8000-${Math.floor(Math.random()*1000000000000).toString().padStart(12, '0')}`;
      const res = await queryDb(
        `INSERT INTO public.profiles (id, name, email, phone, role, password, avatar)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO UPDATE 
         SET name = EXCLUDED.name, phone = EXCLUDED.phone, role = EXCLUDED.role, password = EXCLUDED.password, avatar = EXCLUDED.avatar
         RETURNING *`,
        [validId, name, email, phone || '', role || 'buyer', password || 'maleber123', avatar || '']
      );
      return NextResponse.json({ success: true, profile: res.rows[0] });
    }

    if (action === 'update_profile') {
      const { id, name, email, phone, role } = data;
      const validId = parseUuidOrNull(id);
      if (validId) {
        await queryDb(
          `UPDATE public.profiles SET name = $1, email = $2, phone = $3, role = $4 WHERE id = $5`,
          [name, email, phone, role, validId]
        );
      } else if (email) {
        await queryDb(
          `UPDATE public.profiles SET name = $1, phone = $2, role = $3 WHERE email = $4`,
          [name, phone, role, email]
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'change_password') {
      const { id, email, phone, currentPassword, newPassword } = data;
      const uId = id ? String(id) : '';
      const uEmail = email ? String(email) : '';
      const uPhone = phone ? String(phone) : '';

      try {
        const profRes = await queryDb(
          `SELECT * FROM public.profiles WHERE id::text = $1 OR (email IS NOT NULL AND email = $2) OR (phone IS NOT NULL AND phone = $3)`,
          [uId, uEmail, uPhone]
        ).catch(() => ({ rows: [] }));

        const profile = profRes.rows[0];
        if (profile && profile.password && currentPassword) {
          const isValid = verifyPassword(currentPassword, profile.password);
          if (!isValid) {
            return NextResponse.json({ success: false, error: 'Kata sandi lama Anda tidak sesuai!' }, { status: 400 });
          }
        }

        const hashed = newPassword.startsWith('$sha256$') ? newPassword : hashPassword(newPassword);

        await queryDb(
          `UPDATE public.profiles SET password = $1 WHERE id::text = $2 OR (email IS NOT NULL AND email = $3) OR (phone IS NOT NULL AND phone = $4)`,
          [hashed, uId, uEmail, uPhone]
        );

        return NextResponse.json({ success: true, message: 'Kata sandi berhasil diperbarui' });
      } catch (err: any) {
        console.error('change_password error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    if (action === 'create_driver') {
      const { id, name, phone, vehicleModel, vehicleNumber, lat, lng } = data;
      const driverPhone = phone || '081399887766';
      const driverLat = typeof lat === 'number' ? lat : (-6.8155 + (Math.random() - 0.5) * 0.004);
      const driverLng = typeof lng === 'number' ? lng : (107.1865 + (Math.random() - 0.5) * 0.004);
      const modelStr = vehicleModel || 'Motor Ojek Maleber';
      const numStr = vehicleNumber || 'F 1234 MBR';

      try {
        const validUuid = parseUuidOrNull(id) || `00000000-0000-4000-8000-${Math.floor(Math.random()*1000000000000).toString().padStart(12, '0')}`;
        
        // 1. Insert driver user identity into public.profiles
        await queryDb(
          `INSERT INTO public.profiles (id, name, phone, role, password)
           VALUES ($1, $2, $3, 'driver', $4)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, role = 'driver'`,
          [validUuid, name, driverPhone, hashPassword('maleber123')]
        ).catch((e) => console.warn('create_driver profile notice:', e.message));

        // 2. Insert driver location marker into public.driver_locations
        await queryDb(
          `INSERT INTO public.driver_locations (id, name, driver_name, phone, lat, lng, is_online, rating, review_count, vehicle_model, vehicle_number)
           VALUES ($1, $2, $2, $3, $4, $5, TRUE, 5.0, 1, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name, driver_name = EXCLUDED.name, phone = EXCLUDED.phone, lat = EXCLUDED.lat, lng = EXCLUDED.lng, is_online = TRUE, vehicle_model = EXCLUDED.vehicle_model, vehicle_number = EXCLUDED.vehicle_number`,
          [validUuid, name, driverPhone, driverLat, driverLng, modelStr, numStr]
        );

        // 3. Insert vehicle specifications into public.driver_vehicles
        await queryDb(
          `INSERT INTO public.driver_vehicles (driver_id, vehicle_model, vehicle_number, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (driver_id) DO UPDATE SET vehicle_model = EXCLUDED.vehicle_model, vehicle_number = EXCLUDED.vehicle_number, updated_at = NOW()`,
          [validUuid, modelStr, numStr]
        ).catch((e) => console.warn('create_driver vehicle notice:', e.message));

        return NextResponse.json({ success: true, driverId: validUuid });
      } catch (err: any) {
        console.error('create_driver error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    if (action === 'create_store') {
      const { id, name, ownerName, phone, category, address, lat, lng, image, description } = data;
      const storeId = id || `store-${Date.now().toString().slice(-4)}`;
      const ownerId = `usr-seller-${Date.now().toString().slice(-4)}`;
      const storeLat = typeof lat === 'number' ? lat : -6.8155;
      const storeLng = typeof lng === 'number' ? lng : 107.1865;
      const imgUrl = image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';

      try {
        const validUuid = `00000000-0000-4000-8000-${Math.floor(Math.random()*1000000000000).toString().padStart(12, '0')}`;
        await queryDb(
          `INSERT INTO public.profiles (id, name, phone, role, password)
           VALUES ($1, $2, $3, 'seller', $4)
           ON CONFLICT (email) DO NOTHING`,
          [validUuid, ownerName || name, phone || '081234567890', hashPassword('maleber123')]
        ).catch((e) => console.warn('create_store owner notice:', e.message));

        await queryDb(
          `INSERT INTO public.stores (id, owner_id, name, category, address, lat, lng, is_active, image, description, rating, review_count, owner_name, phone)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $9, 5.0, 1, $10, $11)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name, category = EXCLUDED.category, address = EXCLUDED.address, lat = EXCLUDED.lat, lng = EXCLUDED.lng, image = EXCLUDED.image, description = EXCLUDED.description, owner_name = EXCLUDED.owner_name, phone = EXCLUDED.phone`,
          [storeId, ownerId, name, category || 'Kuliner', address || 'Desa Maleber', storeLat, storeLng, imgUrl, description || '', ownerName || 'Pemilik UMKM', phone || '081234567890']
        );

        return NextResponse.json({ success: true, storeId });
      } catch (err: any) {
        console.error('create_store error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    if (action === 'update_store') {
      const { id, name, ownerName, phone, category, address, lat, lng, image, description } = data;
      const validStoreId = parseUuidOrNull(id) || id;

      try {
        await queryDb(
          `UPDATE public.stores 
           SET 
             name = COALESCE($1, name),
             owner_name = COALESCE($2, owner_name),
             phone = COALESCE($3, phone),
             category = COALESCE($4, category),
             address = COALESCE($5, address),
             image = COALESCE($6, image),
             description = COALESCE($7, description)
           WHERE id::text = $8 OR owner_id = $8`,
          [name || null, ownerName || null, phone || null, category || null, address || null, image || null, description || null, String(validStoreId)]
        );
        return NextResponse.json({ success: true });
      } catch (err: any) {
        console.error('update_store error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    if (action === 'delete_profile') {
      const { id, email } = data;
      console.log('API POST delete_profile triggered:', { id, email });

      try {
        const uId = id ? String(id) : '';
        const uEmail = email ? String(email) : '';

        // Fetch user metadata before deletion to match driver/store/order names & phones
        const profileRes = await queryDb(
          `SELECT * FROM public.profiles WHERE id::text = $1 OR (email IS NOT NULL AND email = $2)`,
          [uId, uEmail]
        ).catch(() => ({ rows: [] }));

        const p = profileRes.rows[0] || {};
        const targetId = p.id ? String(p.id) : uId;
        const targetName = p.name ? String(p.name) : '';
        const targetPhone = p.phone ? String(p.phone) : '';
        const targetEmail = p.email ? String(p.email) : uEmail;

        // 1. Delete dependent messages
        await queryDb(
          `DELETE FROM public.messages WHERE sender_id IN ($1, $2) OR receiver_id IN ($1, $2) OR sender_name = $3 OR receiver_name = $3`,
          [targetId, targetEmail, targetName]
        ).catch((e) => console.warn('Delete messages notice:', e.message));

        // 2. Delete dependent reviews
        await queryDb(
          `DELETE FROM public.reviews WHERE user_id::text IN ($1, $2) OR target_id IN ($1, $2, $3)`,
          [targetId, targetEmail, targetName]
        ).catch((e) => console.warn('Delete reviews notice:', e.message));

        // 3. Delete dependent orders (buyer, seller, or driver)
        await queryDb(
          `DELETE FROM public.orders WHERE buyer_id::text IN ($1, $2) OR seller_id::text IN ($1, $2) OR driver_id::text IN ($1, $2) OR buyer_name = $3 OR driver_name = $3`,
          [targetId, targetEmail, targetName]
        ).catch((e) => console.warn('Delete orders notice:', e.message));

        // 4. Delete dependent ride requests (passenger or driver)
        await queryDb(
          `DELETE FROM public.ride_requests WHERE passenger_id::text IN ($1, $2) OR driver_id::text IN ($1, $2) OR passenger_name = $3 OR driver_name = $3`,
          [targetId, targetEmail, targetName]
        ).catch((e) => console.warn('Delete rides notice:', e.message));

        // 5. Delete products belonging to user's stores
        await queryDb(
          `DELETE FROM public.products WHERE store_id IN (SELECT id FROM public.stores WHERE owner_id::text IN ($1, $2) OR owner_name = $3)`,
          [targetId, targetEmail, targetName]
        ).catch((e) => console.warn('Delete products notice:', e.message));

        // 6. Delete dependent stores
        await queryDb(
          `DELETE FROM public.stores WHERE owner_id::text IN ($1, $2) OR owner_name = $3 OR (phone IS NOT NULL AND phone = $4)`,
          [targetId, targetEmail, targetName, targetPhone]
        ).catch((e) => console.warn('Delete stores notice:', e.message));

        // 7. Delete dependent driver locations & vehicles
        await queryDb(
          `DELETE FROM public.driver_locations WHERE id IN ($1, $2) OR name = $3 OR (phone IS NOT NULL AND phone = $4)`,
          [targetId, targetEmail, targetName, targetPhone]
        ).catch((e) => console.warn('Delete driver_locations notice:', e.message));

        await queryDb(
          `DELETE FROM public.driver_vehicles WHERE driver_id IN ($1, $2) OR driver_id = $3`,
          [targetId, targetEmail, targetName]
        ).catch((e) => console.warn('Delete driver_vehicles notice:', e.message));

        // 8. Delete password reset requests
        await queryDb(
          `DELETE FROM public.reset_requests WHERE user_id IN ($1, $2) OR user_email = $2 OR user_phone = $4`,
          [targetId, targetEmail, targetName, targetPhone]
        ).catch((e) => console.warn('Delete reset_requests notice:', e.message));

        // 9. Finally, delete target profile from public.profiles
        const delRes = await queryDb(
          `DELETE FROM public.profiles WHERE id::text = $1 OR (email IS NOT NULL AND email = $2) RETURNING *`,
          [targetId, targetEmail]
        );

        console.log('Successfully deleted profile with full cascade:', delRes.rows);
        return NextResponse.json({ success: true, deleted: delRes.rows });
      } catch (err: any) {
        console.error('delete_profile error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('API POST /api/db error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
