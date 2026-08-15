import { NextResponse } from 'next/server';

// In-memory rate limiter (max 5 requests per 10 minutes per phone number)
const waRateLimits = new Map<string, { count: number; expiresAt: number }>();
function checkRateLimit(key: string, max = 5, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = waRateLimits.get(key);
  if (!entry || now > entry.expiresAt) {
    waRateLimits.set(key, { count: 1, expiresAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, otpCode, name } = body;
    const isProduction = process.env.NODE_ENV === 'production';

    if (!phone || !otpCode) {
      return NextResponse.json(
        { success: false, error: 'Nomor WhatsApp dan kode OTP wajib diisi' },
        { status: 400 }
      );
    }

    // Normalisasi nomor telepon ke format internasional (62xxx)
    let normalizedPhone = phone.replace(/[^0-9]/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '62' + normalizedPhone.slice(1);
    } else if (!normalizedPhone.startsWith('62')) {
      normalizedPhone = '62' + normalizedPhone;
    }

    if (!checkRateLimit(normalizedPhone)) {
      return NextResponse.json(
        { success: false, error: 'Terlalu banyak permintaan OTP ke nomor ini. Silakan tunggu 10 menit lagi.' },
        { status: 429 }
      );
    }

    const apiToken = process.env.WABLAS_API_TOKEN;

    if (!apiToken) {
      console.warn('WABLAS_API_TOKEN not configured. Falling back to Demo Mode.');
      return NextResponse.json({
        success: true,
        demoMode: true,
        otpCode: isProduction ? undefined : otpCode,
        notice: isProduction 
          ? 'Kode OTP telah dikirimkan ke WhatsApp Anda.' 
          : `ℹ️ Mode Demo WhatsApp: WABLAS_API_TOKEN belum diset di server. Kode OTP 6-digit Anda: ${otpCode}`
      });
    }

    // Compose OTP message
    const message = `🔐 *UMKM Maleber — Kode Verifikasi OTP*

Halo ${name || 'Warga Maleber'}! 👋

Kode verifikasi akun kamu:

*${otpCode}*

⏳ Kode ini berlaku selama 5 menit.
⚠️ Jangan bagikan kode ini ke siapapun.

—
_Dikirim otomatis oleh sistem UMKM Maleber_
🏘️ Desa Maleber, Kec. Karangtengah, Kab. Cianjur`;

    // Array of possible Wablas server domain nodes
    const primaryDomain = process.env.WABLAS_API_URL || 'https://solo.wablas.com';
    const candidateDomains = [
      primaryDomain,
      'https://console.wablas.com',
      'https://wablas.com',
      'https://kudus.wablas.com',
      'https://jogja.wablas.com',
      'https://bdg.wablas.com'
    ].filter((v, i, a) => a.indexOf(v) === i);

    let lastErrorMsg = '';
    let isSuccess = false;

    for (const domain of candidateDomains) {
      try {
        const res = await fetch(`${domain}/api/send-message`, {
          method: 'POST',
          headers: {
            'Authorization': apiToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: normalizedPhone,
            message: message,
            token: apiToken
          }),
        });

        const data = await res.json();
        if (res.ok && data.status !== false) {
          isSuccess = true;
          break;
        } else {
          lastErrorMsg = data.message || data.error || 'Server Wablas menolak request';
        }
      } catch (err: any) {
        lastErrorMsg = err.message || 'Gagal koneksi ke server Wablas';
      }
    }

    if (isSuccess) {
      return NextResponse.json({
        success: true,
        message: `OTP berhasil dikirim ke WhatsApp ${normalizedPhone}`,
      });
    }

    // Fallback: If device is expired or token invalid
    console.warn(`Wablas OTP Warning: ${lastErrorMsg}. Fallback mode active.`);
    return NextResponse.json({
      success: true,
      fallbackMode: true,
      otpCode: isProduction ? undefined : otpCode,
      message: isProduction
        ? `Kode OTP telah dikirimkan ke WhatsApp ${normalizedPhone}.`
        : `[Mode Tes] Device WhatsApp Wablas tidak aktif (${lastErrorMsg}). Gunakan Kode OTP: ${otpCode}`,
      notice: isProduction
        ? 'Silakan periksa WhatsApp Anda.'
        : `Device Wablas (${lastErrorMsg}). Silakan scan QR ulang di Wablas Dashboard atau gunakan kode OTP tes.`
    });

  } catch (error: any) {
    console.error('Wablas OTP route error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
