import { Pool } from 'pg';

const rawConnectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.qkbkleckkupkhtszlelb:Y%23Nva6ESWNC%2BVju@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true';

// Auto-convert port 5432 to port 6543 (transaction pooler) if connecting to supabase pooler to prevent max client session limit
const connectionString = rawConnectionString.includes('pooler.supabase.com:5432')
  ? rawConnectionString.replace('pooler.supabase.com:5432', 'pooler.supabase.com:6543') + (rawConnectionString.includes('?') ? '&pgbouncer=true' : '?pgbouncer=true')
  : rawConnectionString;

let pool: Pool | null = null;

export function getDbPool() {
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 4000
    });
  }
  return pool;
}

export async function queryDb(text: string, params?: any[]) {
  const p = getDbPool();
  return p.query(text, params);
}
