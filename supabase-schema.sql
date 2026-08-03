-- =========================================================
-- DATABASE SCHEMA & SEED DATA: DIGITALISASI UMKM & OJEK ONLINE DESA MALEBER
-- Kecamatan Karangtengah, Kabupaten Cianjur, Jawa Barat
-- =========================================================

-- 1. Create Profiles Table (Role: buyer, seller, driver, admin)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT UNIQUE,
  role TEXT CHECK (role IN ('buyer', 'seller', 'driver', 'admin')) DEFAULT 'buyer',
  avatar TEXT,
  rating NUMERIC(3,2) DEFAULT 5.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Stores Table (Profil UMKM Desa)
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('Kuliner', 'Hasil Tani', 'Kerajinan', 'Toko Kelontong', 'Jasa')) NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  rating NUMERIC(3,2) DEFAULT 5.0,
  review_count INTEGER DEFAULT 1,
  image TEXT,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Products Table (Katalog Barang / Makanan)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  description TEXT,
  ingredients TEXT[],
  category TEXT,
  image TEXT,
  images TEXT[],
  is_available BOOLEAN DEFAULT true,
  unit TEXT DEFAULT 'porsi',
  rating NUMERIC(3,2) DEFAULT 5.0,
  sales_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Orders Table (Pemesanan Makanan / Barang)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID REFERENCES public.profiles(id),
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  store_id UUID REFERENCES public.stores(id),
  store_name TEXT NOT NULL,
  driver_id UUID REFERENCES public.profiles(id),
  driver_name TEXT,
  driver_phone TEXT,
  items JSONB NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  delivery_fee NUMERIC(12,2) DEFAULT 5000,
  status TEXT CHECK (status IN ('pending', 'cooking', 'ready_for_pickup', 'delivering', 'completed', 'cancelled')) DEFAULT 'pending',
  delivery_address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  is_rated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Ride Requests Table (Ojek Online Penumpang)
CREATE TABLE IF NOT EXISTS public.ride_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  passenger_id UUID REFERENCES public.profiles(id),
  passenger_name TEXT NOT NULL,
  passenger_phone TEXT NOT NULL,
  driver_id UUID REFERENCES public.profiles(id),
  driver_name TEXT,
  driver_phone TEXT,
  pickup_address TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  dest_address TEXT NOT NULL,
  dest_lat DOUBLE PRECISION NOT NULL,
  dest_lng DOUBLE PRECISION NOT NULL,
  fare NUMERIC(12,2) NOT NULL,
  distance_km NUMERIC(5,2) NOT NULL,
  status TEXT CHECK (status IN ('requested', 'accepted', 'arrived_pickup', 'on_the_way', 'completed', 'cancelled')) DEFAULT 'requested',
  is_rated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create Reviews Table (Sistem Rating & Ulasan)
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_id UUID NOT NULL,
  target_type TEXT CHECK (target_type IN ('store', 'driver', 'product')) NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  user_name TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- DISABLE RLS OR ADD FULL ACCESS POLICIES SO SUPABASE REST API CAN READ/WRITE FULLY
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews DISABLE ROW LEVEL SECURITY;

-- =========================================================
-- AUTHENTIC SEED DATA: DESA MALEBER, KARANGTENGAH, CIANJUR
-- =========================================================

-- Insert Profiles (User Roles)
INSERT INTO public.profiles (id, name, phone, email, role, avatar, rating) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Teh Rina Maleber', '081234567890', 'rina@maleber.des.id', 'buyer', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80', 5.00),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Ibu Imas', '081234567891', 'imas@maleber.des.id', 'seller', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80', 4.90),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Kang Asep', '082198765432', 'asep@maleber.des.id', 'driver', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', 4.95),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Pak Kades Maleber', '085711223344', 'petugas@maleber.des.id', 'admin', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', 5.00)
ON CONFLICT (id) DO NOTHING;

-- Insert Stores (UMKM Maleber)
INSERT INTO public.stores (id, owner_id, name, category, address, lat, lng, owner_name, phone, rating, review_count, image, description) VALUES
('s1111111-1111-1111-1111-111111111111', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Warung Liwet Khas Cianjur Ibu Imas', 'Kuliner', 'Jl. Raya Maleber No. 12, RT 02/RW 01, Maleber, Karangtengah, Cianjur', -6.8155, 107.1865, 'Ibu Imas', '081234567891', 4.90, 48, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', 'Nasi Liwet komplit khas Cianjur, Nasi Timbel, Ayam Goreng Kampung & Sambal Dadak Maleber.'),
('s2222222-2222-2222-2222-222222222222', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Oleh-Oleh Manisan & Tauco Cap Maleber', 'Hasil Tani', 'Jl. Maleber Kaler No. 45, Karangtengah, Cianjur', -6.8162, 107.1878, 'Pak Mangun', '082198765432', 4.80, 32, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80', 'Manisan buah pala, cermai, tauco asli khas Cianjur & cemilan tradisional Maleber.'),
('s3333333-3333-3333-3333-333333333333', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Tani Makmur Beras Pandanwangi Maleber', 'Hasil Tani', 'Blok Sawah Maleber Kidul, Karangtengah, Cianjur', -6.8148, 107.1852, 'Kang Ujang', '085711223344', 4.90, 56, 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=600&q=80', 'Beras Pandanwangi asli Cianjur dari sawah irigasi teknis Desa Maleber.')
ON CONFLICT (id) DO NOTHING;

-- Insert Products
INSERT INTO public.products (id, store_id, name, price, description, ingredients, category, image, images, is_available, unit, rating, sales_count) VALUES
('p1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', 'Paket Nasi Liwet Komplit Cianjur', 25000, 'Nasi liwet, ayam goreng kampung, tahu tempe, lalapan & sambal dadak khas Maleber.', ARRAY['Beras Pandanwangi', 'Ayam Kampung', 'Tahu', 'Tempe', 'Sambal Dadak', 'Lalapan Segar'], 'Makanan Utama', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', ARRAY['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80'], true, 'porsi', 4.90, 245),
('p2222222-2222-2222-2222-222222222222', 's1111111-1111-1111-1111-111111111111', 'Es Jeruk Peras Kebun Maleber', 6000, 'Jeruk peras segar dingin dari kebun warga Maleber.', ARRAY['Jeruk Lokal', 'Es Batu', 'Gula Aren'], 'Minuman', 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80', ARRAY['https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80'], true, 'gelas', 4.70, 189),
('p3333333-3333-3333-3333-333333333333', 's2222222-2222-2222-2222-222222222222', 'Manisan Buah Pala & Cermai 250g', 18000, 'Manisan basah buah pala segar dengan gula murni.', ARRAY['Buah Pala', 'Gula Pasir Murni'], 'Cemilan', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80', ARRAY['https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80'], true, 'bungkus', 4.80, 142),
('p4444444-4444-4444-4444-444444444444', 's3333333-3333-3333-3333-333333333333', 'Beras Pandanwangi Asli Cianjur 5kg', 85000, 'Beras wangi alami khas Cianjur dari kelompok tani Desa Maleber.', ARRAY['Padi Pandanwangi Organik'], 'Hasil Tani', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80', ARRAY['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'], true, 'karung 5kg', 4.95, 310)
ON CONFLICT (id) DO NOTHING;
