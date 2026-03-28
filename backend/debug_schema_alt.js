import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function debug() {
  try {
    const tables = await pool.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND column_name IN ('tenant_id', 'store_id')
    `);
    console.log('Tables with tenant_id or store_id:');
    console.table(tables.rows);

    const tenants = await pool.query("SELECT id, name FROM tenants");
    console.log('\nTenants:');
    console.table(tenants.rows);

    const stores = await pool.query("SELECT id, name, tenant_id FROM stores");
    console.log('\nStores:');
    console.table(stores.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

debug();
