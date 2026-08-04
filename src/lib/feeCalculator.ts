/**
 * 🏦 Fee Calculator — Sistem Biaya & Komisi Platform Maleber
 *
 * Model bisnis mirip Gojek/Grab:
 * - Pembeli (Buyer):  Membayar harga produk + ongkir + biaya jasa aplikasi
 * - Penjual (Seller): Dipotong komisi penjualan dari subtotal produk
 * - Driver:           Dipotong komisi platform dari pendapatan ongkir/tarif ojek
 *
 * Untuk metode COD:
 * - Driver mengumpulkan total pembayaran dari pembeli
 * - Lalu platform otomatis memotong komisi dari saldo driver
 *   (simulasi: langsung dikurangi dari pendapatan bersih driver)
 */

// ────────────────────────────────────────────────────────
// 💰 KONFIGURASI TARIF — Ubah di sini untuk adjust revenue
// ────────────────────────────────────────────────────────

/** Biaya layanan aplikasi flat yang dibebankan ke pembeli */
export const BUYER_APP_FEE = 2000; // Rp 2.000

/** Persentase komisi platform dari subtotal penjualan (dipotong dari penjual) */
export const SELLER_COMMISSION_RATE = 0.05; // 5%

/** Persentase komisi platform dari pendapatan driver (ongkir / tarif ojek) */
export const DRIVER_COMMISSION_RATE = 0.20; // 20%

/** Ongkir default untuk pengiriman makanan/produk dalam desa */
export const DEFAULT_DELIVERY_FEE = 5000; // Rp 5.000

// ────────────────────────────────────────────────────────
// 📊 TIPE & INTERFACE
// ────────────────────────────────────────────────────────

export interface OrderFeeBreakdown {
  /** Subtotal harga produk (qty × price) */
  subtotal: number;
  /** Ongkos kirim yang dibayar pembeli */
  deliveryFee: number;
  /** Biaya jasa aplikasi yang dibayar pembeli */
  appFee: number;
  /** Total yang dibayar pembeli */
  totalBuyer: number;

  /** Komisi platform dari penjual (5% subtotal) */
  sellerCommission: number;
  /** Pendapatan bersih penjual setelah dipotong komisi */
  sellerNetIncome: number;

  /** Komisi platform dari driver (20% ongkir) */
  driverCommission: number;
  /** Pendapatan bersih driver setelah dipotong komisi */
  driverNetIncome: number;

  /** Total pendapatan platform (appFee + sellerCommission + driverCommission) */
  platformRevenue: number;
}

export interface RideFeeBreakdown {
  /** Tarif ojek bruto */
  fare: number;
  /** Biaya jasa aplikasi yang dibayar penumpang */
  appFee: number;
  /** Total yang dibayar penumpang */
  totalPassenger: number;

  /** Komisi platform dari driver (20% tarif) */
  driverCommission: number;
  /** Pendapatan bersih driver setelah dipotong komisi */
  driverNetIncome: number;

  /** Total pendapatan platform (appFee + driverCommission) */
  platformRevenue: number;
}

// ────────────────────────────────────────────────────────
// 🧮 FUNGSI KALKULASI
// ────────────────────────────────────────────────────────

/**
 * Hitung breakdown biaya lengkap untuk pesanan makanan/produk.
 */
export function calculateOrderFees(subtotal: number, deliveryFee: number = DEFAULT_DELIVERY_FEE): OrderFeeBreakdown {
  const appFee = subtotal > 0 ? BUYER_APP_FEE : 0;
  const totalBuyer = subtotal + deliveryFee + appFee;

  const sellerCommission = Math.round(subtotal * SELLER_COMMISSION_RATE);
  const sellerNetIncome = subtotal - sellerCommission;

  const driverCommission = Math.round(deliveryFee * DRIVER_COMMISSION_RATE);
  const driverNetIncome = deliveryFee - driverCommission;

  const platformRevenue = appFee + sellerCommission + driverCommission;

  return {
    subtotal,
    deliveryFee,
    appFee,
    totalBuyer,
    sellerCommission,
    sellerNetIncome,
    driverCommission,
    driverNetIncome,
    platformRevenue,
  };
}

/**
 * Hitung breakdown biaya lengkap untuk ride (ojek).
 */
export function calculateRideFees(fare: number): RideFeeBreakdown {
  const appFee = fare > 0 ? BUYER_APP_FEE : 0;
  const totalPassenger = fare + appFee;

  const driverCommission = Math.round(fare * DRIVER_COMMISSION_RATE);
  const driverNetIncome = fare - driverCommission;

  const platformRevenue = appFee + driverCommission;

  return {
    fare,
    appFee,
    totalPassenger,
    driverCommission,
    driverNetIncome,
    platformRevenue,
  };
}

/**
 * Format angka ke format Rupiah Indonesia.
 */
export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

/**
 * Format persentase untuk display.
 */
export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}
