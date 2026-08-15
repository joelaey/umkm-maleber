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

    const apiToken = (
      process.env.WABLAS_API_TOKEN ||
      process.env.TRL_TOKEN ||
      process.env.WABLAS_TOKEN ||
      process.env.WABLAS_API_KEY ||
      process.env.NEXT_PUBLIC_WABLAS_TOKEN ||
      ''
    ).trim();

    if (!apiToken) {
      console.warn('Wablas token not configured in environment variables.');
      return NextResponse.json({
        success: false,
        error: 'WABLAS_API_TOKEN / TRL_TOKEN belum diset di Vercel Environment Variables. Silakan gunakan opsi Verifikasi via Email atau hubungi admin.'
      }, { status: 500 });
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

    const secretKey = (process.env.WABLAS_SECRET_KEY || process.env.SECRET_KEY || '').trim();

    // Direct fast dispatch to Wablas server node
    const domain = (process.env.WABLAS_API_URL || 'https://tegal.wablas.com').replace(/\/$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const headersJson: Record<string, string> = {
      'Authorization': apiToken,
      'Content-Type': 'application/json',
    };
    if (secretKey) {
      headersJson['secret'] = secretKey;
    }

    const payload: Record<string, any> = {
      phone: normalizedPhone,
      message: message,
      token: apiToken,
    };
    if (secretKey) {
      payload.secret = secretKey;
    }

    try {
      // 1. Try standard JSON post
      let res = await fetch(`${domain}/api/send-message`, {
        method: 'POST',
        signal: controller.signal,
        headers: headersJson,
        body: JSON.stringify(payload),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      // 2. Fallback to URL-encoded form data if needed
      if (!res.ok || data.status === false) {
        try {
          const headersForm: Record<string, string> = {
            'Authorization': apiToken,
            'Content-Type': 'application/x-www-form-urlencoded',
          };
          if (secretKey) {
            headersForm['secret'] = secretKey;
          }

          const formBody = new URLSearchParams({
            phone: normalizedPhone,
            message: message,
            token: apiToken
          });
          if (secretKey) {
            formBody.append('secret', secretKey);
          }

          const formRes = await fetch(`${domain}/api/send-message`, {
            method: 'POST',
            signal: controller.signal,
            headers: headersForm,
            body: formBody,
          });
          const formData = await formRes.json();
          if (formRes.ok && formData.status !== false) {
            res = formRes;
            data = formData;
          }
        } catch {}
      }

      clearTimeout(timeoutId);

      if (res.ok && data.status !== false) {
        return NextResponse.json({
          success: true,
          message: `OTP berhasil dikirim ke nomor WhatsApp ${normalizedPhone}`,
        });
      } else {
        const errorMsg = data.message || data.error || 'Server Wablas menolak request';
        console.error(`Wablas API Error: ${errorMsg}`);
        return NextResponse.json({
          success: false,
          error: `Pengiriman WhatsApp gagal (${errorMsg}). Pastikan field "Whitelist IP" di Wablas sudah DIKOSONGKAN atau gunakan verifikasi Email.`
        }, { status: 400 });
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Wablas connection error:', err.message);
      return NextResponse.json({
        success: false,
        error: 'Koneksi ke server WhatsApp timed out. Silakan gunakan opsi "Verifikasi via Email" yang lebih cepat.'
      }, { status: 504 });
    }

  } catch (error: any) {
    console.error('Wablas OTP route error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
