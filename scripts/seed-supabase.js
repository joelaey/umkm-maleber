const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.qkbkleckkupkhtszlelb:Y%23Nva6ESWNC%2BVju@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL Database...');

  // 1. Drop constraints & add missing columns safely
  await client.query(`
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey1;
    ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_owner_id_fkey;
    ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_store_id_fkey;
    ALTER TABLE public.driver_locations DROP CONSTRAINT IF EXISTS driver_locations_id_fkey;

    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'maleber123';
    ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 1;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ingredients TEXT[];
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[];
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 5.0;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0;
    
    CREATE TABLE IF NOT EXISTS public.messages (
      id UUID PRIMARY KEY,
      order_id TEXT,
      ride_id TEXT,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      receiver_name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
  `);

  // Clear existing data to ensure clean production baseline
  await client.query('DELETE FROM public.reviews;');
  await client.query('DELETE FROM public.orders;');
  await client.query('DELETE FROM public.ride_requests;');
  await client.query('DELETE FROM public.products;');
  await client.query('DELETE FROM public.stores;');
  await client.query('DELETE FROM public.driver_locations;');
  await client.query('DELETE FROM public.profiles;');

  // 2. Insert 12 Real Users (1 Super Admin, 2 Petugas Desa, 3 Penjual, 3 Driver, 3 Pembeli)
  await client.query(`
    INSERT INTO public.profiles (id, name, phone, email, password, role, avatar, rating) VALUES
    -- 1 SUPER ADMIN
    ('a1111111-1111-4111-8111-111111111111', 'Super Admin Maleber', '081100000001', 'superadmin@maleber.des.id', 'maleber123', 'admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', 5.00),
    
    -- 2 PETUGAS DESA (ADMIN DESA)
    ('a2222222-2222-4222-8222-222222222222', 'Pak Kades Sukarna', '081100000002', 'kades@maleber.des.id', 'maleber123', 'admin', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', 5.00),
    ('a3333333-3333-4333-8333-333333333333', 'Bu Sekdes Ani', '081100000003', 'sekdes@maleber.des.id', 'maleber123', 'admin', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80', 5.00),

    -- 3 PENJUAL UMKM
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Ibu Imas (Warung Liwet)', '081234567891', 'imas@maleber.des.id', 'maleber123', 'seller', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80', 4.90),
    ('b2222222-2222-4222-8222-222222222222', 'Pak Mangun (Oleh-Oleh)', '081234567892', 'mangun@maleber.des.id', 'maleber123', 'seller', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80', 4.85),
    ('b3333333-3333-4333-8333-333333333333', 'Kang Ujang (Tani Makmur)', '081234567893', 'ujang@maleber.des.id', 'maleber123', 'seller', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', 4.95),

    -- 3 DRIVER OJEK ONLINE DESA
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Kang Asep', '082198765432', 'asep@maleber.des.id', 'maleber123', 'driver', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', 4.95),
    ('c2222222-2222-4222-8222-222222222222', 'Kang Dede', '082198765433', 'dede@maleber.des.id', 'maleber123', 'driver', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80', 4.90),
    ('c3333333-3333-4333-8333-333333333333', 'Kang Cecep', '082198765434', 'cecep@maleber.des.id', 'maleber123', 'driver', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80', 4.88),

    -- 3 PEMBELI WARGA MALEBER
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Teh Rina Maleber', '081234567890', 'rina@maleber.des.id', 'maleber123', 'buyer', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80', 5.00),
    ('d2222222-2222-4222-8222-222222222222', 'Pak RT Maman', '085711223301', 'maman@maleber.des.id', 'maleber123', 'buyer', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80', 5.00),
    ('d3333333-3333-4333-8333-333333333333', 'Bu RW Eli', '085711223302', 'eli@maleber.des.id', 'maleber123', 'buyer', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80', 5.00);
  `);

  // 3. Insert Stores (UMKM Maleber)
  await client.query(`
    INSERT INTO public.stores (id, owner_id, name, category, address, lat, lng, owner_name, phone, rating, review_count, image, description) VALUES
    ('11111111-1111-4111-8111-111111111111', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Warung Liwet Khas Cianjur Ibu Imas', 'Kuliner', 'Jl. Raya Maleber No. 12, RT 02/RW 01, Maleber, Karangtengah, Cianjur', -6.8155, 107.1865, 'Ibu Imas', '081234567891', 4.90, 48, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', 'Nasi Liwet komplit khas Cianjur, Nasi Timbel, Ayam Goreng Kampung & Sambal Dadak Maleber.'),
    ('22222222-2222-4222-8222-222222222222', 'b2222222-2222-4222-8222-222222222222', 'Oleh-Oleh Manisan & Tauco Cap Maleber', 'Hasil Tani', 'Jl. Maleber Kaler No. 45, Karangtengah, Cianjur', -6.8162, 107.1878, 'Pak Mangun', '081234567892', 4.85, 32, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80', 'Manisan buah pala, cermai, tauco asli khas Cianjur & cemilan tradisional Maleber.'),
    ('33333333-3333-4333-8333-333333333333', 'b3333333-3333-4333-8333-333333333333', 'Tani Makmur Beras Pandanwangi Maleber', 'Hasil Tani', 'Blok Sawah Maleber Kidul, Karangtengah, Cianjur', -6.8148, 107.1852, 'Kang Ujang', '081234567893', 4.95, 56, 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=600&q=80', 'Beras Pandanwangi asli Cianjur dari sawah irigasi teknis Desa Maleber.');
  `);

  // 4. Insert Authentic Products
  await client.query(`
    INSERT INTO public.products (id, store_id, name, price, description, ingredients, category, image, images, is_available, unit, rating, sales_count) VALUES
    ('b1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'Paket Nasi Liwet Komplit Cianjur', 25000, 'Nasi liwet, ayam goreng kampung, tahu tempe, lalapan & sambal dadak khas Maleber.', ARRAY['Beras Pandanwangi', 'Ayam Kampung', 'Tahu', 'Tempe', 'Sambal Dadak', 'Lalapan Segar'], 'Kuliner', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', ARRAY['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80'], true, 'porsi', 4.90, 245),
    ('b2222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'Es Jeruk Peras Kebun Maleber', 6000, 'Jeruk peras segar dingin dari kebun warga Maleber.', ARRAY['Jeruk Lokal', 'Es Batu', 'Gula Aren'], 'Kuliner', 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80', ARRAY['https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80'], true, 'gelas', 4.70, 189),
    ('b3333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', 'Manisan Buah Pala & Cermai 250g', 18000, 'Manisan basah buah pala segar dengan gula murni.', ARRAY['Buah Pala', 'Gula Pasir Murni'], 'Hasil Tani', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80', ARRAY['https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80'], true, 'bungkus', 4.80, 142),
    ('b4444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333', 'Beras Pandanwangi Asli Cianjur 5kg', 85000, 'Beras wangi alami khas Cianjur dari kelompok tani Desa Maleber.', ARRAY['Padi Pandanwangi Organik'], 'Hasil Tani', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80', ARRAY['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'], true, 'karung 5kg', 4.95, 310);
  `);

  // 5. Insert Driver Locations
  await client.query(`
    INSERT INTO public.driver_locations (id, driver_name, phone, vehicle_number, vehicle_model, is_online, lat, lng, rating) VALUES
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Kang Asep Driver Maleber', '082198765432', 'F 4521 YZ', 'Honda Vario 160', true, -6.8150, 107.1860, 4.95),
    ('c2222222-2222-4222-8222-222222222222', 'Kang Dede Ojek Desa', '082198765433', 'F 3312 WX', 'Yamaha NMAX 155', true, -6.8170, 107.1880, 4.90),
    ('c3333333-3333-4333-8333-333333333333', 'Kang Cecep Ojek Maleber', '082198765434', 'F 2104 ZY', 'Honda Beat FI 110', true, -6.8135, 107.1845, 4.88);
  `);

  console.log('🎉 SUCCESSFULLY SEEDED 12 REAL USERS AND REAL PRODUCTS INTO SUPABASE!');

  for (let t of ['profiles', 'stores', 'products', 'orders', 'ride_requests', 'driver_locations', 'reviews']) {
    const res = await client.query('SELECT count(*) FROM public.' + t);
    console.log('Final row count of ' + t + ':', res.rows[0].count);
  }

  client.end();
}

run().catch((e) => {
  console.error('Migration error:', e);
  client.end();
});
