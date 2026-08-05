import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db';

function parseUuidOrNull(val: any) {
  if (typeof val !== 'string') return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(val) ? val : null;
}

export async function GET() {
  try {
    // Ensure profiles table exists with password column
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

      CREATE TABLE IF NOT EXISTS public.driver_vehicles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        driver_id TEXT UNIQUE NOT NULL,
        vehicle_model TEXT NOT NULL,
        vehicle_number TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      UPDATE public.profiles SET role = 'superadmin' WHERE email = 'superadmin@maleber.des.id' AND role != 'superadmin';
    `).catch((e) => console.error('Profiles & Orders table init notice:', e.message));

    const profilesRes = await queryDb('SELECT * FROM public.profiles ORDER BY created_at DESC').catch(() => ({ rows: [] }));
    const storesRes = await queryDb('SELECT * FROM public.stores ORDER BY created_at DESC');
    const productsRes = await queryDb('SELECT * FROM public.products ORDER BY created_at DESC');
    const driversRes = await queryDb('SELECT * FROM public.driver_locations ORDER BY updated_at DESC');
    const driverVehiclesRes = await queryDb('SELECT * FROM public.driver_vehicles').catch(() => ({ rows: [] }));
    const ordersRes = await queryDb('SELECT * FROM public.orders ORDER BY created_at DESC');
    const ridesRes = await queryDb('SELECT * FROM public.ride_requests ORDER BY created_at DESC');
    const reviewsRes = await queryDb('SELECT * FROM public.reviews ORDER BY created_at DESC');
    const messagesRes = await queryDb('SELECT * FROM public.messages ORDER BY created_at ASC');

    const users = profilesRes.rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      password: u.password,
      role: u.email === 'superadmin@maleber.des.id' ? 'superadmin' : (u.role || 'buyer'),
      avatar: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
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
        name: d.driver_name,
        phone: d.phone,
        vehicleNumber: v ? v.vehicle_number : d.vehicle_number,
        vehicleModel: v ? v.vehicle_model : d.vehicle_model,
        isOnline: d.is_online,
        lat: Number(d.lat),
        lng: Number(d.lng),
        rating: Number(d.rating) || 0,
        reviewCount: 0
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

    return NextResponse.json({
      success: true,
      users,
      stores,
      products,
      drivers,
      orders,
      rides,
      reviews,
      messages
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
        [validUserId, name, email || null, phone || null, password || null, role || 'buyer', avatar || null]
      );

      console.log('API POST SUCCESS: Registered user in Supabase public.profiles:', res.rows[0]);
      return NextResponse.json({ success: true, user: res.rows[0] });
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
        [validId, name, email, phone || '', role || 'buyer', password || 'maleber123', avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80']
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

    if (action === 'delete_profile') {
      const { id, email } = data;
      console.log('API POST delete_profile triggered:', { id, email });

      try {
        const uId = id ? String(id) : '';
        const uEmail = email ? String(email) : '';

        // 1. Delete dependent messages
        await queryDb(
          `DELETE FROM public.messages WHERE sender_id IN (SELECT id::text FROM public.profiles WHERE id::text = $1 OR email = $2) OR receiver_id IN (SELECT id::text FROM public.profiles WHERE id::text = $1 OR email = $2)`,
          [uId, uEmail]
        ).catch((e) => console.warn('Delete messages notice:', e.message));

        // 2. Delete dependent reviews (user_id is UUID, target_id is TEXT) - SEPARATE SQL QUERIES TO PREVENT OPERATOR TYPE MISMATCH
        await queryDb(
          `DELETE FROM public.reviews WHERE user_id IN (SELECT id FROM public.profiles WHERE id::text = $1 OR email = $2)`,
          [uId, uEmail]
        ).catch((e) => console.warn('Delete user reviews notice:', e.message));

        await queryDb(
          `DELETE FROM public.reviews WHERE target_id IN (SELECT id::text FROM public.profiles WHERE id::text = $1 OR email = $2)`,
          [uId, uEmail]
        ).catch((e) => console.warn('Delete target reviews notice:', e.message));

        // 3. Delete dependent orders
        await queryDb(
          `DELETE FROM public.orders WHERE buyer_id IN (SELECT id FROM public.profiles WHERE id::text = $1 OR email = $2)`,
          [uId, uEmail]
        ).catch((e) => console.warn('Delete orders notice:', e.message));

        // 4. Delete dependent ride requests
        await queryDb(
          `DELETE FROM public.ride_requests WHERE passenger_id IN (SELECT id FROM public.profiles WHERE id::text = $1 OR email = $2)`,
          [uId, uEmail]
        ).catch((e) => console.warn('Delete rides notice:', e.message));

        // 5. Delete dependent stores
        await queryDb(
          `DELETE FROM public.stores WHERE owner_id IN (SELECT id FROM public.profiles WHERE id::text = $1 OR email = $2)`,
          [uId, uEmail]
        ).catch((e) => console.warn('Delete stores notice:', e.message));

        // 6. Delete dependent driver locations & vehicles
        await queryDb(
          `DELETE FROM public.driver_locations WHERE id IN (SELECT id FROM public.profiles WHERE id::text = $1 OR email = $2)`,
          [uId, uEmail]
        ).catch((e) => console.warn('Delete driver_locations notice:', e.message));

        await queryDb(
          `DELETE FROM public.driver_vehicles WHERE driver_id IN (SELECT id::text FROM public.profiles WHERE id::text = $1 OR email = $2)`,
          [uId, uEmail]
        ).catch((e) => console.warn('Delete driver_vehicles notice:', e.message));

        // 7. Finally, delete target profile from public.profiles
        const delRes = await queryDb(
          `DELETE FROM public.profiles WHERE id::text = $1 OR email = $2 RETURNING *`,
          [uId, uEmail]
        );

        console.log('Successfully deleted profile:', delRes.rows);
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
