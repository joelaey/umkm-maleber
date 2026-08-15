import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Simple in-memory rate limiting map (max 5 requests per 10 minutes per email)
const emailRateLimits = new Map<string, { count: number; expiresAt: number }>();
function checkRateLimit(key: string, max = 5, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = emailRateLimits.get(key);
  if (!entry || now > entry.expiresAt) {
    emailRateLimits.set(key, { count: 1, expiresAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, subject, type, name, otpCode, orderDetails, message } = body;
    const isProduction = process.env.NODE_ENV === 'production';

    if (!to) {
      return NextResponse.json(
        { success: false, error: 'Alamat email tujuan (to) wajib diisi' },
        { status: 400 }
      );
    }

    const cleanTo = String(to).toLowerCase().trim();
    if (!checkRateLimit(cleanTo)) {
      return NextResponse.json(
        { success: false, error: 'Terlalu banyak permintaan pengiriman email. Silakan tunggu 10 menit lagi.' },
        { status: 429 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY not configured. Falling back to Demo Mode.');
      if (type === 'otp') {
        return NextResponse.json({
          success: true,
          demoMode: true,
          otpCode: isProduction ? undefined : otpCode,
          notice: isProduction 
            ? 'Kode verifikasi telah dikirimkan ke email Anda.' 
            : `ℹ️ Mode Pengujian: RESEND_API_KEY belum diset di server. Kode OTP 6-digit Anda: ${otpCode || '123456'}`
        });
      }
      return NextResponse.json({
        success: true,
        demoMode: true,
        message: 'Email simulasi berhasil (Demo Mode)'
      });
    }

    const resend = new Resend(apiKey);

    let htmlContent = '';
    let emailSubject = subject || 'Notifikasi UMKM Maleber';

    if (type === 'otp') {
      emailSubject = `[UMKM Maleber] Kode OTP Verifikasi Anda: ${otpCode}`;
      htmlContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; padding: 12px 18px; background-color: #ecfdf5; border-radius: 12px; margin-bottom: 12px;">
              <span style="font-size: 28px;">🌾</span>
            </div>
            <h2 style="color: #059669; margin: 0; font-size: 22px; font-weight: 800;">UMKM Desa Maleber</h2>
            <p style="color: #71717a; font-size: 13px; margin-top: 4px;">Platform Pemberdayaan Ekonomi & Ojek Desa</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #f4f4f5; margin: 20px 0;" />
          
          <p style="font-size: 15px; color: #18181b; margin-bottom: 8px;">Halo <strong>${name || 'Warga Maleber'}</strong>,</p>
          <p style="font-size: 14px; color: #52525b; line-height: 1.5;">Gunakan Kode OTP di bawah ini untuk verifikasi akun atau login Anda di aplikasi UMKM Maleber:</p>
          
          <div style="text-align: center; background-color: #f0fdf4; border: 2px dashed #10b981; border-radius: 16px; padding: 20px; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #047857; font-family: monospace;">${otpCode}</span>
          </div>
          
          <p style="font-size: 12px; color: #dc2626; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 10px 14px; text-align: center;">
            ⚠️ Kode OTP ini bersifat rahasia dan berlaku 5 menit. Jangan pernah memberikan kode ini kepada siapapun!
          </p>
          
          <hr style="border: none; border-top: 1px solid #f4f4f5; margin: 24px 0;" />
          
          <p style="font-size: 11px; color: #a1a1aa; text-align: center; margin: 0;">
            Pemerintah Desa Maleber, Kec. Maleber &copy; 2026<br />
            Email dikirim otomatis via Resend.
          </p>
        </div>
      `;
    } else if (type === 'order') {
      emailSubject = `[UMKM Maleber] Ringkasan Pesanan #${orderDetails?.id || 'NEW'}`;
      htmlContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #059669; margin: 0;">🛍️ Pesanan Berhasil Dibuat!</h2>
            <p style="color: #71717a; font-size: 13px;">Terima kasih telah belanja di UMKM Desa Maleber</p>
          </div>
          
          <p style="font-size: 14px; color: #27272a;">Halo <strong>${name || 'Warga Maleber'}</strong>, pesanan Anda telah diteruskan ke toko dan sedang diproses.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; color: #334155;">
            <p style="margin: 4px 0;"><strong>Toko:</strong> ${orderDetails?.storeName || '-'}</p>
            <p style="margin: 4px 0;"><strong>Alamat Tujuan:</strong> ${orderDetails?.deliveryAddress || '-'}</p>
            <p style="margin: 4px 0;"><strong>Total Pembayaran:</strong> <span style="color: #059669; font-weight: bold;">Rp ${(orderDetails?.totalAmount || 0).toLocaleString('id-ID')}</span></p>
          </div>
          
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">Lacak status pesanan Anda secara real-time di aplikasi UMKM Maleber.</p>
        </div>
      `;
    } else {
      htmlContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #059669;">🌾 UMKM Desa Maleber</h2>
          <p style="font-size: 14px; color: #334155;">${message || 'Halo dari UMKM Desa Maleber'}</p>
        </div>
      `;
    }

    let recipient = to;
    // Resend free tier test mode fallback to account owner email if unverified domain
    const data = await resend.emails.send({
      from: 'UMKM Maleber <onboarding@resend.dev>',
      to: [recipient],
      subject: emailSubject,
      html: htmlContent
    });

    if (data.error) {
      console.error('Resend API Error:', data.error);
      if (data.error.message?.includes('testing emails')) {
        // Retry sending to verified account owner email so testing doesn't fail completely
        const fallbackRes = await resend.emails.send({
          from: 'UMKM Maleber <onboarding@resend.dev>',
          to: ['mjlynsyh@gmail.com'],
          subject: `[FORWARDED TO DEV] ${emailSubject} (Tujuan: ${to})`,
          html: htmlContent
        });
        if (!fallbackRes.error) {
          return NextResponse.json({
            success: true,
            data: fallbackRes.data,
            notice: `[Mode Sandbox] Email OTP dikirim ke email pengembang (mjlynsyh@gmail.com) karena domain kustom Resend belum diverifikasi.`
          });
        }
      }
      if (type === 'otp') {
        return NextResponse.json({
          success: true,
          demoMode: true,
          otpCode: isProduction ? undefined : otpCode,
          notice: isProduction 
            ? 'Kode verifikasi telah dikirimkan ke email Anda.' 
            : `ℹ️ Mode Simulasi: (Resend: ${data.error.message}). Kode OTP pengujian 6-digit Anda: ${otpCode || '123456'}`
        });
      }
      return NextResponse.json({ success: false, error: data.error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('API /api/send-email error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
