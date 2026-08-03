const { Client } = require('pg');

const connectionString = "postgresql://postgres.qkbkleckkupkhtszlelb:Y%23Nva6ESWNC%2BVju@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";

async function seedDatabase() {
  console.log("Updating Supabase database tables with Desa Maleber, Karangtengah, Cianjur data...");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Clear old sample stores
    await client.query(`DELETE FROM public.stores;`);

    // 1. Seed Stores with Cianjur coordinates (-6.8155, 107.1865)
    console.log("Seeding stores...");
    await client.query(`
      INSERT INTO public.stores (id, owner_id, name, category, address, lat, lng, owner_name, phone, rating, image, is_active, description)
      VALUES 
      ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'Warung Nasi Ibu Imas Maleber Cianjur', 'Kuliner', 'Jl. Raya Maleber No. 12, RT 02/RW 01, Desa Maleber, Karangtengah, Cianjur', -6.8150, 107.1860, 'Ibu Imas', '081234567890', 4.9, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', true, 'Nasi Liwet khas Cianjur, Nasi Timbel, Ayam Goreng Kampung & Sambal Dadak.'),
      ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', NULL, 'Manisan & Tauco Maleber Cianjur', 'Kuliner', 'Jl. Raya Bandung-Cianjur Sp. Maleber, Desa Maleber, Karangtengah', -6.8130, 107.1880, 'Pak Mangun', '082198765432', 4.8, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80', true, 'Manisan buah khas Cianjur, Tauco Cap Maleber & Cemilan Tradisional.'),
      ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', NULL, 'Beras Pandanwangi Tani Maleber', 'Hasil Tani', 'Blok Sawah Maleber, Karangtengah, Cianjur', -6.8170, 107.1850, 'Kang Ujang', '085711223344', 4.9, 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=600&q=80', true, 'Beras Pandanwangi asli Cianjur dari sawah irigasi Desa Maleber.');
    `);

    console.log("✅ Supabase stores successfully updated for Desa Maleber, Karangtengah, Cianjur!");
  } catch (err) {
    console.error("Seeding error:", err.message);
  } finally {
    await client.end();
  }
}

seedDatabase();
