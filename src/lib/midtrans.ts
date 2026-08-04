/**
 * Midtrans Payment Gateway Client Helper
 * Supports QRIS, Virtual Accounts (BCA, Mandiri, BNI, BRI), E-Wallet (GoPay, ShopeePay), & Retail Outlets
 */

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options?: {
          onSuccess?: (result: any) => void;
          onPending?: (result: any) => void;
          onError?: (result: any) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

export function loadMidtransSnapScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if (window.snap) {
      resolve(true);
      return;
    }

    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '';
    const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true';

    const snapScriptUrl = isProduction
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';

    const script = document.createElement('script');
    script.src = snapScriptUrl;
    script.setAttribute('data-client-key', clientKey);
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

export async function checkoutWithMidtrans(orderData: {
  orderId: string;
  grossAmount: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items?: Array<{ productId: string; productName: string; price: number; quantity: number }>;
  onSuccess?: (result: any) => void;
  onPending?: (result: any) => void;
  onError?: (result: any) => void;
  onClose?: () => void;
}) {
  try {
    // 1. Fetch Snap Token from Backend API Route
    const res = await fetch('/api/midtrans/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    const data = await res.json();

    if (!res.ok || !data.token) {
      throw new Error(data.error || 'Gagal mendapatkan token pembayaran Midtrans');
    }

    // 2. Load Snap Script dynamically if not yet loaded
    await loadMidtransSnapScript();

    // 3. Trigger Snap Popup
    if (window.snap) {
      window.snap.pay(data.token, {
        onSuccess: (result) => {
          console.log('Midtrans Payment Success:', result);
          if (orderData.onSuccess) orderData.onSuccess(result);
        },
        onPending: (result) => {
          console.log('Midtrans Payment Pending:', result);
          if (orderData.onPending) orderData.onPending(result);
        },
        onError: (result) => {
          console.error('Midtrans Payment Error:', result);
          if (orderData.onError) orderData.onError(result);
        },
        onClose: () => {
          console.log('Midtrans Payment Popup Closed');
          if (orderData.onClose) orderData.onClose();
        }
      });
    } else {
      // Fallback: Redirect to Midtrans Redirect URL
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        alert('Midtrans Snap SDK gagal dimuat.');
      }
    }
  } catch (err: any) {
    console.error('Midtrans Checkout Failed:', err);
    alert(`Pembayaran Midtrans Error: ${err.message}`);
  }
}
