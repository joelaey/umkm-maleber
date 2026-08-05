import { Store, Product, DriverInfo, Order, RideRequest, UserProfile, Review, PlacePOI } from '@/types';

// Desa Maleber, Kecamatan Karangtengah, Kabupaten Cianjur Coordinates
export const MALEBER_CENTER = {
  lat: -6.8155,
  lng: 107.1865,
  name: 'Kantor Desa Maleber, Karangtengah - Cianjur'
};

export const INITIAL_USERS: UserProfile[] = [
  // 1 SUPER ADMIN
  {
    id: 'a1111111-1111-4111-8111-111111111111',
    name: 'Super Admin Maleber',
    email: 'superadmin@maleber.des.id',
    phone: '081100000001',
    role: 'superadmin',
    password: 'maleber123',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
  },
  // 2 PETUGAS DESA
  {
    id: 'a2222222-2222-4222-8222-222222222222',
    name: 'Pak Kades Sukarna',
    email: 'kades@maleber.des.id',
    phone: '081100000002',
    role: 'admin',
    password: 'maleber123',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'a3333333-3333-4333-8333-333333333333',
    name: 'Bu Sekdes Ani',
    email: 'sekdes@maleber.des.id',
    phone: '081100000003',
    role: 'admin',
    password: 'maleber123',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'
  },
  // 3 PENJUAL UMKM
  {
    id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    name: 'Ibu Imas',
    email: 'imas@maleber.des.id',
    phone: '081234567891',
    role: 'seller',
    password: 'maleber123',
    storeName: 'Warung Liwet Khas Cianjur Ibu Imas',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'b2222222-2222-4222-8222-222222222222',
    name: 'Pak Mangun',
    email: 'mangun@maleber.des.id',
    phone: '081234567892',
    role: 'seller',
    storeName: 'Oleh-Oleh Manisan & Tauco Cap Maleber',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'b3333333-3333-4333-8333-333333333333',
    name: 'Kang Ujang',
    email: 'ujang@maleber.des.id',
    phone: '081234567893',
    role: 'seller',
    storeName: 'Tani Makmur Beras Pandanwangi Maleber',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
  },
  // 3 DRIVER OJEK ONLINE DESA
  {
    id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    name: 'Kang Asep Driver',
    email: 'asep@maleber.des.id',
    phone: '082198765432',
    role: 'driver',
    password: 'maleber123',
    vehicleInfo: 'Honda Vario 160 (F 4521 YZ)',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'c2222222-2222-4222-8222-222222222222',
    name: 'Kang Dede Driver',
    email: 'dede@maleber.des.id',
    phone: '082198765433',
    role: 'driver',
    password: 'maleber123',
    vehicleInfo: 'Yamaha NMAX 155 (F 3312 WX)',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'c3333333-3333-4333-8333-333333333333',
    name: 'Kang Cecep Driver',
    email: 'cecep@maleber.des.id',
    phone: '082198765434',
    role: 'driver',
    password: 'maleber123',
    vehicleInfo: 'Honda Beat FI (F 2104 ZY)',
    avatar: ''
  },
  // 3 PEMBELI WARGA MALEBER
  {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Teh Rina Maleber',
    email: 'rina@maleber.des.id',
    phone: '081234567890',
    role: 'buyer',
    password: 'maleber123',
    avatar: ''
  },
  {
    id: 'd2222222-2222-4222-8222-222222222222',
    name: 'Pak RT Maman',
    email: 'maman@maleber.des.id',
    phone: '085711223301',
    role: 'buyer',
    password: 'maleber123',
    avatar: ''
  },
  {
    id: 'd3333333-3333-4333-8333-333333333333',
    name: 'Bu RW Eli',
    email: 'eli@maleber.des.id',
    phone: '085711223302',
    role: 'buyer',
    password: 'maleber123',
    avatar: ''
  }
];

export const INITIAL_STORES: Store[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Warung Liwet Khas Cianjur Ibu Imas',
    category: 'Kuliner',
    address: 'Jl. Raya Maleber No. 12, RT 02/RW 01, Maleber, Karangtengah, Cianjur',
    lat: -6.8155,
    lng: 107.1865,
    ownerName: 'Ibu Imas',
    phone: '081234567891',
    rating: 5.0,
    reviewCount: 1,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    description: 'Nasi Liwet komplit khas Cianjur, Nasi Timbel, Ayam Goreng Kampung & Sambal Dadak Maleber.'
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Oleh-Oleh Manisan & Tauco Cap Maleber',
    category: 'Hasil Tani',
    address: 'Jl. Maleber Kaler No. 45, Karangtengah, Cianjur',
    lat: -6.8162,
    lng: 107.1878,
    ownerName: 'Pak Mangun',
    phone: '081234567892',
    rating: 5.0,
    reviewCount: 0,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    description: 'Manisan buah pala, cermai, tauco asli khas Cianjur & cemilan tradisional Maleber.'
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Tani Makmur Beras Pandanwangi Maleber',
    category: 'Hasil Tani',
    address: 'Blok Sawah Maleber Kidul, Karangtengah, Cianjur',
    lat: -6.8148,
    lng: 107.1852,
    ownerName: 'Kang Ujang',
    phone: '081234567893',
    rating: 5.0,
    reviewCount: 0,
    image: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    description: 'Beras Pandanwangi asli Cianjur dari sawah irigasi teknis Desa Maleber.'
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'b1111111-1111-4111-8111-111111111111',
    storeId: '11111111-1111-4111-8111-111111111111',
    name: 'Paket Nasi Liwet Komplit Cianjur',
    price: 25000,
    description: 'Nasi liwet, ayam goreng kampung, tahu tempe, lalapan & sambal dadak khas Maleber.',
    ingredients: ['Beras Pandanwangi', 'Ayam Kampung', 'Tahu', 'Tempe', 'Sambal Dadak', 'Lalapan Segar'],
    category: 'Kuliner',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80'],
    isAvailable: true,
    unit: 'porsi',
    rating: 4.9,
    salesCount: 245,
    variantGroups: [
      {
        id: 'vg-sambal',
        name: 'Pilihan Sambal',
        required: true,
        options: [
          { id: 'opt-s1', name: 'Sambal Dadak Khas Maleber', extraPrice: 0 },
          { id: 'opt-s2', name: 'Sambal Terasi Bakar', extraPrice: 0 },
          { id: 'opt-s3', name: 'Sambal Hijau Pedas', extraPrice: 1000 }
        ]
      },
      {
        id: 'vg-lauk',
        name: 'Lauk Extra & Topping',
        required: false,
        options: [
          { id: 'opt-l1', name: 'Extra Telur Dadar Kebun', extraPrice: 4000 },
          { id: 'opt-l2', name: 'Extra Tahu & Tempe Bacem', extraPrice: 3000 },
          { id: 'opt-l3', name: 'Extra Ayam Goreng Kampung', extraPrice: 12000 }
        ]
      }
    ]
  },
  {
    id: 'b2222222-2222-4222-8222-222222222222',
    storeId: '11111111-1111-4111-8111-111111111111',
    name: 'Es Jeruk Peras Kebun Maleber',
    price: 6000,
    description: 'Jeruk peras segar dingin dari kebun warga Maleber.',
    ingredients: ['Jeruk Lokal', 'Es Batu', 'Gula Aren'],
    category: 'Kuliner',
    image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80'],
    isAvailable: true,
    unit: 'gelas',
    rating: 4.7,
    salesCount: 189
  },
  {
    id: 'b3333333-3333-4333-8333-333333333333',
    storeId: '22222222-2222-4222-8222-222222222222',
    name: 'Kue Tampah Tradisional (PO 2 Hari)',
    price: 120000,
    description: 'Tampah isi 50 pcs kue basah tradisional khas Maleber (Klepon, Onde-onde, Nagasari, Dadar Gulung). Khusus Pre-Order 2 hari sebelum dikirim.',
    ingredients: ['Tepung Ketan', 'Gula Aren', 'Kelapa Parut', 'Santan Segar'],
    category: 'Kuliner',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80'],
    isAvailable: true,
    isPreOrder: true,
    preOrderDays: 2,
    unit: 'tampah',
    rating: 5.0,
    salesCount: 64
  },
  {
    id: 'b4444444-4444-4444-8444-444444444444',
    storeId: '33333333-3333-4333-8333-333333333333',
    name: 'Beras Pandanwangi Asli Cianjur 5kg',
    price: 85000,
    description: 'Beras wangi alami khas Cianjur dari kelompok tani Desa Maleber.',
    ingredients: ['Padi Pandanwangi Organik'],
    category: 'Hasil Tani',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'],
    isAvailable: true,
    unit: 'karung 5kg',
    rating: 4.95,
    salesCount: 310
  }
];

export const INITIAL_DRIVERS: DriverInfo[] = [
  {
    id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    name: 'Kang Asep Driver Maleber',
    phone: '082198765432',
    vehicleNumber: 'F 4521 YZ',
    vehicleModel: 'Honda Vario 160',
    isOnline: true,
    lat: -6.8150,
    lng: 107.1860,
    rating: 5.0,
    reviewCount: 1
  },
  {
    id: 'c2222222-2222-4222-8222-222222222222',
    name: 'Kang Dede Ojek Desa',
    phone: '082198765433',
    vehicleNumber: 'F 3312 WX',
    vehicleModel: 'Yamaha NMAX 155',
    isOnline: true,
    lat: -6.8170,
    lng: 107.1880,
    rating: 5.0,
    reviewCount: 1
  },
  {
    id: 'c3333333-3333-4333-8333-333333333333',
    name: 'Kang Cecep Ojek Maleber',
    phone: '082198765434',
    vehicleNumber: 'F 2104 ZY',
    vehicleModel: 'Honda Beat FI 110',
    isOnline: true,
    lat: -6.8135,
    lng: 107.1845,
    rating: 5.0,
    reviewCount: 1
  }
];

// INITIAL REVIEWS (STORED & PERSISTED IN SUPABASE POSTGRESQL REVIEWS TABLE)
export const INITIAL_REVIEWS: Review[] = [
  // Product Reviews for Paket Nasi Liwet Komplit Cianjur (b1111111-1111-4111-8111-111111111111)
  {
    id: '30000000-0001-4000-8000-000000000001',
    targetId: 'b1111111-1111-4111-8111-111111111111',
    targetType: 'product',
    userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    userName: 'Teh Rina Maleber',
    rating: 5,
    comment: 'Nasi liwetnya luar biasa enak, bumbunya meresap sampai ke dalam ayam kampungnya! Pengantaran cepat.',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: '30000000-0002-4000-8000-000000000002',
    targetId: 'b1111111-1111-4111-8111-111111111111',
    targetType: 'product',
    userId: 'd2222222-2222-4222-8222-222222222222',
    userName: 'Pak RT Maman',
    rating: 5,
    comment: 'Porsi melimpah, sambal dadaknya pedas nampol khas Cianjur. Recomended!',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  },

  // Product Reviews for Beras Pandanwangi Asli Cianjur (b4444444-4444-4444-8444-444444444444)
  {
    id: '30000000-0003-4000-8000-000000000003',
    targetId: 'b4444444-4444-4444-8444-444444444444',
    targetType: 'product',
    userId: 'd3333333-3333-4333-8333-333333333333',
    userName: 'Bu RW Eli',
    rating: 5,
    comment: 'Beras Pandanwangi asli wangi alami tanpa pemutih, cocok buat acara keluarga. Penjual ramah sekali.',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
  },

  // Driver Reviews for Kang Asep Driver Maleber (c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33)
  {
    id: '30000000-0004-4000-8000-000000000004',
    targetId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    targetType: 'driver',
    userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    userName: 'Teh Rina Maleber',
    rating: 5,
    comment: 'Sangat sopan, ramah, dan mengemudi dengan aman sampai ke rumah. Helm penumpang juga bersih.',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
  },

  // Driver Reviews for Kang Dede Ojek Desa (c2222222-2222-4222-8222-222222222222)
  {
    id: '30000000-0005-4000-8000-000000000005',
    targetId: 'c2222222-2222-4222-8222-222222222222',
    targetType: 'driver',
    userId: 'd2222222-2222-4222-8222-222222222222',
    userName: 'Pak RT Maman',
    rating: 5,
    comment: 'Driver terpercaya warga Maleber, tepat waktu dan hafal gang-gang kecil desa.',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
  },

  // Store Reviews for Warung Liwet Khas Cianjur Ibu Imas (11111111-1111-4111-8111-111111111111)
  {
    id: '30000000-0006-4000-8000-000000000006',
    targetId: '11111111-1111-4111-8111-111111111111',
    targetType: 'store',
    userId: 'd3333333-3333-4333-8333-333333333333',
    userName: 'Bu RW Eli',
    rating: 5,
    comment: 'Warung bersih, pelayanan cepat, dan masakan khas Sunda Cianjur paling otentik!',
    createdAt: new Date(Date.now() - 3600000 * 36).toISOString()
  }
];
export const INITIAL_ORDERS: Order[] = [];
export const INITIAL_RIDES: RideRequest[] = [];

// INITIAL PLACES OF INTEREST (CLEAN EMPTY ARRAY — PLACES ARE FETCHED DYNAMICALLY VIA OPENSTREETMAP API)
export const INITIAL_PLACES: PlacePOI[] = [];
