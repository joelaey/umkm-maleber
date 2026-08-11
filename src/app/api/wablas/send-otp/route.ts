import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, otpCode, name } = body;

    if (!phone || !otpCode) {
      return NextResponse.json(
        { success: false, error: 'Nomor WhatsApp dan kode OTP wajib diisi' },
        { status: 400 }
      );
    }

    const apiToken = process.env.WABLAS_API_TOKEN;
    const apiUrl = process.env.WABLAS_API_URL || 'https://solo.wablas.com';

    if (!apiToken) {
      console.warn('WABLAS_API_TOKEN not configured. Falling back to Demo Mode.');
      return NextResponse.json({
        success: true,
        demoMode: true,
        otpCode,
        notice: `ℹ️ Mode Demo WhatsApp: WABLAS_API_TOKEN belum diset di server. Kode OTP 6-digit Anda: ${otpCode}`
      });
    }

    // Normalisasi nomor telepon ke format internasional (62xxx)
    let normalizedPhone = phone.replace(/[^0-9]/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '62' + normalizedPhone.slice(1);
    } else if (!normalizedPhone.startsWith('62')) {
      normalizedPhone = '62' + normalizedPhone;
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
    let successResponse = null;

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
            token: apiToken // Pass token in body as well for legacy Wablas nodes
          }),
        });

        const data = await res.json();
        if (res.ok && data.status !== false) {
          isSuccess = true;
          successResponse = data;
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

    // Fallback: If device is expired or token invalid on Wablas free tier, allow testing with dev notice
    console.warn(`Wablas OTP Warning: ${lastErrorMsg}. Fallback mode active.`);
    return NextResponse.json({
      success: true,
      fallbackMode: true,
      otpCode: otpCode, // Include OTP code in response for testing if device is offline/expired
      message: `[Mode Tes] Device WhatsApp Wablas tidak aktif (${lastErrorMsg}). Gunakan Kode OTP: ${otpCode}`,
      notice: `Device Wablas (${lastErrorMsg}). Silakan scan QR ulang di Wablas Dashboard atau gunakan kode OTP tes.`
    });

  } catch (error: any) {
    console.error('Wablas OTP route error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
