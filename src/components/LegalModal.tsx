'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'privacy' | 'terms';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy'
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Legalitas & Ketentuan Layanan</h3>
              <p className="text-xs text-slate-500">Platform Resmi UMKM & Ojek Desa Maleber</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-white px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`pb-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'privacy'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Kebijakan Privasi
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`pb-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'terms'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" /> Syarat & Ketentuan
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-600 leading-relaxed">
          {activeTab === 'privacy' ? (
            <>
              <div>
                <h4 className="font-bold text-slate-800 text-base mb-2">1. Pengumpulan Informasi</h4>
                <p>
                  Platform UMKM Maleber (<strong>umkmmaleber.com</strong>) mengumpulkan informasi penting dari pengguna seperti nama lengkap, nomor WhatsApp, alamat email, serta koordinat lokasi pengantaran untuk memfasilitasi transaksi jual-beli dan layanan ojek desa.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-base mb-2">2. Keamanan & Kerahasiaan Data</h4>
                <p>
                  Data kata sandi akun Anda dienkripsi secara aman dengan algoritma kriptografi (SHA-256 Hash + Salt) pada server. Kami tidak pernah membagikan atau menjual data pribadi warga kepada pihak ketiga yang tidak berwenang.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-base mb-2">3. Transaksi Pembayaran (Payment Gateway)</h4>
                <p>
                  Seluruh pembayaran digital (QRIS, GoPay, ShopeePay, Transfer Bank) diproses langsung melalui sistem resmi <strong>Midtrans (PT Midtrans Indonesia)</strong> yang telah berlisensi Bank Indonesia dan bersertifikasi PCI-DSS Level 1.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-base mb-2">4. Notifikasi WhatsApp & Email</h4>
                <p>
                  Nomor WhatsApp dan email Anda hanya digunakan untuk keperluan pengiriman Kode OTP, konfirmasi pesanan, dan pembaruan status pengantaran langsung dari sistem Desa Maleber.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h4 className="font-bold text-slate-800 text-base mb-2">1. Ketentuan Pengguna</h4>
                <p>
                  Dengan mendaftar dan bertransaksi di UMKM Maleber, Anda setuju untuk memberikan data yang benar, menjaga kerahasiaan akun dan kode OTP Anda, serta tidak melakukan tindakan penipuan atau pemesanan fiktif.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-base mb-2">2. Tanggung Jawab Penjual & Driver</h4>
                <ul className="list-disc pl-5 space-y-1 mt-1 text-slate-600">
                  <li><strong>Mitra Toko:</strong> Bertanggung jawab atas kualitas, kebersihan, dan ketersediaan stok produk yang dijual.</li>
                  <li><strong>Mitra Ojek/Driver:</strong> Wajib mengutamakan keselamatan penumpang, memiliki SIM dan kendaraan laik jalan.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-base mb-2">3. Kebijakan Pembatalan & Pengembalian Dana</h4>
                <p>
                  Pesanan dapat dibatalkan sebelum toko mulai memasak/menyiapkan barang atau sebelum driver menjemput. Pembayaran digital yang dibatalkan sah akan dikembalikan sesuai prosedur keuangan Bumdes Desa Maleber.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-base mb-2">4. Hak Cipta & Kontak Layanan</h4>
                <p>
                  Platform ini dikelola untuk pemberdayaan ekonomi lokal Desa Maleber, Kec. Karangtengah, Kab. Cianjur. Layanan bantuan dapat dihubungi melalui email pengelola di <strong>admin@umkmmaleber.com</strong>.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Terverifikasi Desa Maleber &copy; 2026</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors shadow-sm"
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};
