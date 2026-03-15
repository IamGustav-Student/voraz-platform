
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

// Force 5432 since 5433 is closed but 5432 is open
const connectionString = process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:5432/${process.env.DB_NAME}`;

async function test() {
  const pool = new pg.Pool({ connectionString });
  try {
    const res = await pool.query('SELECT id, name, subdomain, status, plan_type FROM tenants');
    console.log('TENANTS IN DB:');
    console.table(res.rows);
  } catch (e) {
    console.error('ERROR:', e.message);
  }
  await pool.end();
}

test();
