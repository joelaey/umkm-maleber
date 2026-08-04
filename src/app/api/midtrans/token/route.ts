import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, grossAmount, customerName, customerEmail, customerPhone, items } = body;

    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true';

    const snapEndpoint = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    // Encode Server Key for Basic Authentication Header
    const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;

    let processedItems: any[] = [];
    if (items && items.length > 0) {
      processedItems = items.map((it: any) => ({
        id: (it.productId || `item-${Math.random()}`).slice(0, 50),
        price: Math.round(it.price),
        quantity: it.quantity || 1,
        name: (it.productName || 'Produk UMKM Maleber').slice(0, 50)
      }));

      const itemsSum = processedItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
      const targetGross = Math.round(grossAmount || 10000);

      if (targetGross > itemsSum) {
        processedItems.push({
          id: 'fee-service-delivery',
          price: targetGross - itemsSum,
          quantity: 1,
          name: 'Biaya Layanan & Pengiriman'
        });
      } else if (targetGross < itemsSum) {
        // Fallback: replace with single aggregated item
        processedItems = [{
          id: `item-${Date.now()}`,
          price: targetGross,
          quantity: 1,
          name: 'Pesanan UMKM / Ojek Maleber'
        }];
      }
    } else {
      processedItems = [
        {
          id: `item-${Date.now()}`,
          price: Math.round(grossAmount || 10000),
          quantity: 1,
          name: 'Pesanan UMKM / Ojek Maleber'
        }
      ];
    }

    const payload = {
      transaction_details: {
        order_id: orderId || `ORDER-${Date.now()}`,
        gross_amount: Math.round(grossAmount || 10000)
      },
      customer_details: {
        first_name: customerName || 'Warga Maleber',
        email: customerEmail || 'warga@maleber.des.id',
        phone: customerPhone || '081234567890'
      },
      item_details: processedItems,
      enabled_payments: ['gopay', 'shopeepay', 'qris', 'other_qris'],
      credit_card: {
        secure: true
      }
    };

    const res = await fetch(snapEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Midtrans API Error Response:', data);
      return NextResponse.json(
        { error: data.error_messages ? data.error_messages.join(', ') : 'Gagal membuat transaksi Midtrans' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      token: data.token,
      redirect_url: data.redirect_url
    });

  } catch (error: any) {
    console.error('Midtrans route handler exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
