import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new pg.Pool({
  user: String(process.env.DB_USER),
  host: String(process.env.DB_HOST),
  database: String(process.env.DB_NAME),
  password: String(process.env.DB_PASSWORD),
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function debug() {
  try {
    const tablesRes = await pool.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND column_name IN ('tenant_id', 'store_id')
      ORDER BY table_name
    `);
    console.log('Tables and Columns:');
    console.table(tablesRes.rows);

    const tenantsRes = await pool.query("SELECT id, name FROM tenants");
    console.log('\nTenants:');
    console.table(tenantsRes.rows);

  } catch (err) {
    console.error('Error debugging:', err.message);
  } finally {
    await pool.end();
  }
}

debug();
