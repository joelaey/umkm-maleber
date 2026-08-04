import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status } = body;

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      return NextResponse.json({ success: false, error: 'Server Key not set' }, { status: 500 });
    }

    // Verify SHA-512 Signature Key for Security: sha512(order_id + status_code + gross_amount + ServerKey)
    const payloadSignature = crypto
      .createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest('hex');

    if (signature_key && signature_key !== payloadSignature) {
      console.error('Midtrans Webhook Invalid Signature!');
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 403 });
    }

    let isPaid = false;
    if (transaction_status === 'settlement') {
      isPaid = true;
    } else if (transaction_status === 'capture' && fraud_status === 'accept') {
      isPaid = true;
    }

    if (isPaid) {
      console.log(`[Midtrans Webhook] Payment CONFIRMED PAID for order: ${order_id}`);
      // Update payment_status = 'paid' and is_paid = true in DB PostgreSQL orders table
      await queryDb(
        `UPDATE public.orders SET payment_status = 'paid', is_paid = TRUE WHERE id = $1`,
        [order_id]
      ).catch(() => {});

      // Update payment_status = 'paid' and is_paid = true in DB PostgreSQL ride_requests table
      await queryDb(
        `UPDATE public.ride_requests SET payment_status = 'paid', is_paid = TRUE WHERE id = $1`,
        [order_id]
      ).catch(() => {});
    }

    return NextResponse.json({ success: true, isPaid, orderId: order_id });
  } catch (err: any) {
    console.error('Midtrans Webhook Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
