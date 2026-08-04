import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { success: false, isPaid: false, error: 'orderId wajib diisi' },
        { status: 400 }
      );
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true';

    if (!serverKey) {
      return NextResponse.json(
        { success: false, isPaid: false, error: 'MIDTRANS_SERVER_KEY belum dikonfigurasi' },
        { status: 500 }
      );
    }

    const baseUrl = isProduction
      ? 'https://api.midtrans.com/v2'
      : 'https://api.sandbox.midtrans.com/v2';

    const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;

    // Query Midtrans Server-to-Server Transaction Status API
    const res = await fetch(`${baseUrl}/${orderId}/status`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    });

    const data = await res.json();

    if (!res.ok) {
      console.warn('Midtrans Status API Response Notice:', data);
      return NextResponse.json({
        success: false,
        isPaid: false,
        transactionStatus: data.transaction_status || 'not_found',
        error: data.status_message || 'Transaksi tidak ditemukan di Midtrans'
      });
    }

    const transactionStatus = data.transaction_status;
    const fraudStatus = data.fraud_status;

    // Check if payment is strictly settlement / capture (PAID)
    let isPaid = false;
    if (transactionStatus === 'settlement') {
      isPaid = true;
    } else if (transactionStatus === 'capture') {
      if (fraudStatus === 'challenge') {
        isPaid = false;
      } else {
        isPaid = true;
      }
    }

    console.log(`[Midtrans Verify] Order ${orderId} Status: ${transactionStatus} -> isPaid: ${isPaid}`);

    return NextResponse.json({
      success: true,
      isPaid,
      transactionStatus,
      fraudStatus,
      paymentType: data.payment_type,
      grossAmount: data.gross_amount,
      settlementTime: data.settlement_time
    });

  } catch (err: any) {
    console.error('Midtrans Verify API Error:', err);
    return NextResponse.json(
      { success: false, isPaid: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
