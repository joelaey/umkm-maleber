import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db';

function parseUuidOrNull(val: any) {
  if (typeof val !== 'string') return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(val) ? val : null;
}

export async function GET() {
  try {
    const storesRes = await queryDb('SELECT * FROM public.stores ORDER BY created_at DESC');
    const productsRes = await queryDb('SELECT * FROM public.products ORDER BY created_at DESC');
    const driversRes = await queryDb('SELECT * FROM public.driver_locations ORDER BY updated_at DESC');
    const ordersRes = await queryDb('SELECT * FROM public.orders ORDER BY created_at DESC');
    const ridesRes = await queryDb('SELECT * FROM public.ride_requests ORDER BY created_at DESC');
    const reviewsRes = await queryDb('SELECT * FROM public.reviews ORDER BY created_at DESC');
    const messagesRes = await queryDb('SELECT * FROM public.messages ORDER BY created_at ASC');

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
      rating: Number(p.rating) || 5.0,
      salesCount: p.sales_count || 0
    }));

    const drivers = driversRes.rows.map((d) => ({
      id: d.id,
      name: d.driver_name,
      phone: d.phone,
      vehicleNumber: d.vehicle_number,
      vehicleModel: d.vehicle_model,
      isOnline: d.is_online,
      lat: Number(d.lat),
      lng: Number(d.lng),
      rating: Number(d.rating) || 5.0,
      reviewCount: 12
    }));

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
      message: m.message,
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
        deliveryAddress,
        lat,
        lng
      } = data;

      const validOrderId = parseUuidOrNull(id) || `10000000-${Date.now().toString().slice(-4)}-4000-8000-${Math.floor(Math.random()*1000000000000).toString().padStart(12, '0')}`;
      const validBuyerId = parseUuidOrNull(buyerId);
      const validStoreId = parseUuidOrNull(storeId);

      const res = await queryDb(
        `INSERT INTO public.orders (id, buyer_id, buyer_name, buyer_phone, store_id, store_name, items, total_amount, delivery_fee, status, delivery_address, lat, lng)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
          deliveryAddress || 'Desa Maleber',
          lat || -6.8155,
          lng || 107.1865
        ]
      );

      console.log('API POST SUCCESS: Inserted order into Supabase!', res.rows[0]);
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
        status
      } = data;

      const validRideId = parseUuidOrNull(id) || `20000000-${Date.now().toString().slice(-4)}-4000-8000-${Math.floor(Math.random()*1000000000000).toString().padStart(12, '0')}`;
      const validPassengerId = parseUuidOrNull(passengerId);

      const res = await queryDb(
        `INSERT INTO public.ride_requests (id, passenger_id, passenger_name, passenger_phone, pickup_address, pickup_lat, pickup_lng, dest_address, dest_lat, dest_lng, distance_km, fare, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
          status || 'requested'
        ]
      );

      console.log('API POST SUCCESS: Inserted ride request into Supabase!', res.rows[0]);
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

      if (validDriverId) {
        await queryDb(
          `UPDATE public.orders SET status = $1, driver_id = $2, driver_name = $3 WHERE id = $4`,
          [status, validDriverId, driverName, validOrderId]
        );
      } else if (cancelReason) {
        await queryDb(`UPDATE public.orders SET status = $1, cancel_reason = $2 WHERE id = $3`, [status, cancelReason, validOrderId]);
      } else {
        await queryDb(`UPDATE public.orders SET status = $1 WHERE id = $2`, [status, validOrderId]);
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'update_ride_status') {
      const { rideId, status, driverId, driverName, cancelReason } = data;
      const validRideId = parseUuidOrNull(rideId) || rideId;
      const validDriverId = parseUuidOrNull(driverId);

      if (validDriverId) {
        await queryDb(
          `UPDATE public.ride_requests SET status = $1, driver_id = $2, driver_name = $3 WHERE id = $4`,
          [status, validDriverId, driverName, validRideId]
        );
      } else if (cancelReason) {
        await queryDb(`UPDATE public.ride_requests SET status = $1, cancel_reason = $2 WHERE id = $3`, [status, cancelReason, validRideId]);
      } else {
        await queryDb(`UPDATE public.ride_requests SET status = $1 WHERE id = $2`, [status, validRideId]);
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
      const { id, orderId, rideId, senderId, senderName, senderRole, receiverId, receiverName, message } = data;
      const validMsgId = parseUuidOrNull(id) || `50000000-${Date.now().toString().slice(-4)}-4000-8000-${Math.floor(Math.random()*1000000000000).toString().padStart(12, '0')}`;

      const res = await queryDb(
        `INSERT INTO public.messages (id, order_id, ride_id, sender_id, sender_name, sender_role, receiver_id, receiver_name, message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
          message || ''
        ]
      );
      return NextResponse.json({ success: true, message: res.rows[0] });
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

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('API POST /api/db error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
