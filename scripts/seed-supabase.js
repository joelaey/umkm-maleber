const { Client } = require('pg');
const crypto = require('crypto');

const SALT_SECRET = 'maleber_village_security_salt_key_2026';
function hashPassword(plainPassword) {
  if (!plainPassword) return '';
  const hmac = crypto.createHmac('sha256', SALT_SECRET);
  hmac.update(plainPassword);
  return `$sha256$${hmac.digest('hex')}`;
}

const connectionString = 'postgresql://postgres.qkbkleckkupkhtszlelb:Y%23Nva6ESWNC%2BVju@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true';

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL (Port 6543 Transaction Pooler)...');

    // 1. Create Core Tables
    console.log('Creating database schema & tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'buyer',
        avatar TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.stores (
        id TEXT PRIMARY KEY,
        owner_id TEXT,
        name TEXT NOT NULL,
        category TEXT,
        address TEXT,
        lat NUMERIC DEFAULT -6.8155,
        lng NUMERIC DEFAULT 107.1865,
        owner_name TEXT,
        phone TEXT,
        rating NUMERIC DEFAULT 5.0,
        review_count INT DEFAULT 1,
        image TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.products (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        store_id TEXT NOT NULL,
        name TEXT NOT NULL,
        price NUMERIC(12,2) NOT NULL,
        description TEXT,
        ingredients TEXT[],
        category TEXT,
        image TEXT,
        images TEXT[],
        is_available BOOLEAN DEFAULT TRUE,
        unit TEXT DEFAULT 'porsi',
        rating NUMERIC(3,2) DEFAULT 5.0,
        sales_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.driver_locations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        lat NUMERIC DEFAULT -6.8155,
        lng NUMERIC DEFAULT 107.1865,
        is_online BOOLEAN DEFAULT TRUE,
        rating NUMERIC DEFAULT 5.0,
        review_count INT DEFAULT 1,
        vehicle_model TEXT DEFAULT 'Honda Vario 160',
        vehicle_number TEXT DEFAULT 'F 1234 MBR',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.driver_vehicles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        driver_id TEXT UNIQUE NOT NULL,
        vehicle_model TEXT NOT NULL,
        vehicle_number TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.orders (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        buyer_id UUID,
        buyer_name TEXT NOT NULL,
        buyer_phone TEXT NOT NULL,
        store_id TEXT,
        store_name TEXT NOT NULL,
        driver_id UUID,
        driver_name TEXT,
        items JSONB NOT NULL,
        total_amount NUMERIC(12,2) NOT NULL,
        delivery_fee NUMERIC(12,2) DEFAULT 5000,
        status TEXT DEFAULT 'pending',
        payment_method TEXT DEFAULT 'qris',
        payment_status TEXT DEFAULT 'unpaid',
        is_paid BOOLEAN DEFAULT FALSE,
        delivery_address TEXT NOT NULL,
        lat NUMERIC DEFAULT -6.8155,
        lng NUMERIC DEFAULT 107.1865,
        cancel_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.ride_requests (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        passenger_id UUID,
        passenger_name TEXT NOT NULL,
        passenger_phone TEXT NOT NULL,
        driver_id UUID,
        driver_name TEXT,
        pickup_address TEXT NOT NULL,
        pickup_lat NUMERIC DEFAULT -6.8155,
        pickup_lng NUMERIC DEFAULT 107.1865,
        dest_address TEXT NOT NULL,
        dest_lat NUMERIC DEFAULT -6.8110,
        dest_lng NUMERIC DEFAULT 107.1890,
        distance_km NUMERIC(5,2) DEFAULT 1.0,
        fare NUMERIC(12,2) DEFAULT 6000,
        status TEXT DEFAULT 'requested',
        payment_method TEXT DEFAULT 'qris',
        payment_status TEXT DEFAULT 'unpaid',
        is_paid BOOLEAN DEFAULT FALSE,
        cancel_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.reviews (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        target_id TEXT NOT NULL,
        target_type TEXT NOT NULL,
        user_id UUID,
        user_name TEXT NOT NULL,
        rating INTEGER DEFAULT 5,
        comment TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.messages (
        id UUID PRIMARY KEY,
        order_id TEXT,
        ride_id TEXT,
        sender_id TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        sender_role TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        receiver_name TEXT NOT NULL,
        receiver_role TEXT,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.reset_requests (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id TEXT,
        user_name TEXT,
        user_email TEXT,
        user_phone TEXT,
        reason TEXT,
        status TEXT DEFAULT 'pending',
        admin_reply TEXT,
        new_password_set TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Disable RLS on all tables so Supabase connection can read/write without restriction
    await client.query(`
      ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.stores DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.driver_locations DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.driver_vehicles DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.ride_requests DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.reviews DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.reset_requests DISABLE ROW LEVEL SECURITY;
    `);

    console.log('Seeding authentic Users into Supabase profiles...');
    // Seed real accounts (Superadmins, Officials, Sellers, Drivers, Buyers)
    await client.query(`
      INSERT INTO public.profiles (id, name, phone, email, password, role, avatar) VALUES
      ('a1111111-1111-4111-8111-111111111112', 'Super Admin J.', '081224068820', 'j@superadmin.com', '${hashPassword('a11101977')}', 'superadmin', ''),
      ('a1111111-1111-4111-8111-111111111111', 'Super Admin Maleber', '081100000001', 'superadmin@maleber.des.id', '${hashPassword('maleber123')}', 'superadmin', ''),
      ('a2222222-2222-4222-8222-222222222222', 'Pak Kades Sukarna', '081100000002', 'kades@maleber.des.id', '${hashPassword('maleber123')}', 'admin', ''),
      ('a3333333-3333-4333-8333-333333333333', 'Bu Sekdes Ani', '081100000003', 'sekdes@maleber.des.id', '${hashPassword('maleber123')}', 'admin', ''),
      ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Ibu Imas', '081234567891', 'imas@maleber.des.id', '${hashPassword('maleber123')}', 'seller', ''),
      ('b2222222-2222-4222-8222-222222222222', 'Pak Mangun', '081234567892', 'mangun@maleber.des.id', '${hashPassword('maleber123')}', 'seller', ''),
      ('b3333333-3333-4333-8333-333333333333', 'Kang Ujang', '081234567893', 'ujang@maleber.des.id', '${hashPassword('maleber123')}', 'seller', ''),
      ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Kang Asep', '082198765432', 'asep@maleber.des.id', '${hashPassword('maleber123')}', 'driver', ''),
      ('c2222222-2222-4222-8222-222222222222', 'Kang Dede', '082198765433', 'dede@maleber.des.id', '${hashPassword('maleber123')}', 'driver', ''),
      ('c3333333-3333-4333-8333-333333333333', 'Kang Cecep', '082198765434', 'cecep@maleber.des.id', '${hashPassword('maleber123')}', 'driver', ''),
      ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Teh Rina Maleber', '081234567890', 'rina@maleber.des.id', '${hashPassword('maleber123')}', 'buyer', '')
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        name = EXCLUDED.name;
    `);

    console.log('Seeding Stores & Products...');
    await client.query(`
      INSERT INTO public.stores (id, owner_id, name, category, address, lat, lng, owner_name, phone, rating, review_count, image, is_active, description) VALUES
      ('11111111-1111-4111-8111-111111111111', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Warung Liwet Khas Cianjur Ibu Imas', 'Kuliner', 'Jl. Raya Maleber No. 12, RT 02/RW 01, Maleber, Karangtengah, Cianjur', -6.8155, 107.1865, 'Ibu Imas', '081234567891', 4.90, 12, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', TRUE, 'Nasi Liwet komplit khas Cianjur, Nasi Timbel, Ayam Goreng Kampung & Sambal Dadak Maleber.'),
      ('22222222-2222-4222-8222-222222222222', 'b2222222-2222-4222-8222-222222222222', 'Oleh-Oleh Manisan & Tauco Cap Maleber', 'Hasil Tani', 'Jl. Maleber Kaler No. 45, Karangtengah, Cianjur', -6.8162, 107.1878, 'Pak Mangun', '081234567892', 4.85, 8, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80', TRUE, 'Manisan buah pala, cermai, tauco asli khas Cianjur & cemilan tradisional Maleber.'),
      ('33333333-3333-4333-8333-333333333333', 'b3333333-3333-4333-8333-333333333333', 'Tani Makmur Beras Pandanwangi Maleber', 'Hasil Tani', 'Blok Sawah Maleber Kidul, Karangtengah, Cianjur', -6.8148, 107.1852, 'Kang Ujang', '081234567893', 4.95, 15, 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=600&q=80', TRUE, 'Beras Pandanwangi asli Cianjur dari sawah irigasi teknis Desa Maleber.')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.products (id, store_id, name, price, description, ingredients, category, image, images, is_available, unit, rating, sales_count) VALUES
      ('b1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'Paket Nasi Liwet Komplit Cianjur', 25000, 'Nasi liwet, ayam goreng kampung, tahu tempe, lalapan & sambal dadak khas Maleber.', ARRAY['Beras Pandanwangi', 'Ayam Kampung', 'Tahu', 'Tempe', 'Sambal Dadak', 'Lalapan Segar'], 'Kuliner', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', ARRAY['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80'], TRUE, 'porsi', 4.90, 45),
      ('b2222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'Es Jeruk Peras Kebun Maleber', 6000, 'Jeruk peras segar dingin dari kebun warga Maleber.', ARRAY['Jeruk Lokal', 'Es Batu', 'Gula Aren'], 'Kuliner', 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80', ARRAY['https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80'], TRUE, 'gelas', 4.70, 32),
      ('b3333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', 'Manisan Buah Pala & Cermai 250g', 18000, 'Manisan basah buah pala segar dengan gula murni.', ARRAY['Buah Pala', 'Gula Pasir Murni'], 'Hasil Tani', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80', ARRAY['https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80'], TRUE, 'bungkus', 4.80, 24),
      ('b4444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333', 'Beras Pandanwangi Asli Cianjur 5kg', 85000, 'Beras wangi alami khas Cianjur dari kelompok tani Desa Maleber.', ARRAY['Padi Pandanwangi Organik'], 'Hasil Tani', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80', ARRAY['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'], TRUE, 'karung 5kg', 4.95, 52)
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('Seeding Drivers...');
    await client.query(`
      ALTER TABLE public.driver_locations ALTER COLUMN driver_name DROP NOT NULL;
      ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS name TEXT;
      ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS driver_name TEXT;

      INSERT INTO public.driver_locations (id, name, driver_name, phone, vehicle_number, vehicle_model, is_online, lat, lng, rating) VALUES
      ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Kang Asep Driver Maleber', 'Kang Asep Driver Maleber', '082198765432', 'F 4521 YZ', 'Honda Vario 160', TRUE, -6.8150, 107.1860, 4.95),
      ('c2222222-2222-4222-8222-222222222222', 'Kang Dede Ojek Desa', 'Kang Dede Ojek Desa', '082198765433', 'F 3312 WX', 'Yamaha NMAX 155', TRUE, -6.8170, 107.1880, 4.90),
      ('c3333333-3333-4333-8333-333333333333', 'Kang Cecep Ojek Maleber', 'Kang Cecep Ojek Maleber', '082198765434', 'F 2104 ZY', 'Honda Beat FI 110', TRUE, -6.8135, 107.1845, 4.88)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        driver_name = EXCLUDED.driver_name,
        phone = EXCLUDED.phone,
        vehicle_number = EXCLUDED.vehicle_number,
        vehicle_model = EXCLUDED.vehicle_model,
        is_online = EXCLUDED.is_online;
    `);

    console.log('🎉 ALL SUPABASE REAL PRODUCTION TABLES & SEED DATA INITIALIZED SUCCESSFULLY!');
    await client.end();
  } catch (err) {
    console.error('❌ Seeder Error:', err);
    process.exit(1);
  }
}

run();
