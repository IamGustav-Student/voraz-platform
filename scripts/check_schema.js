import { query } from '../backend/src/config/db.js';

async function checkSchema() {
  const stores = await query("SELECT column_name FROM information_schema.columns WHERE table_name='stores'");
  console.log('Stores Columns:', stores.rows.map(r => r.column_name).join(', '));

  const tenants = await query("SELECT column_name FROM information_schema.columns WHERE table_name='tenants'");
  console.log('Tenants Columns:', tenants.rows.map(r => r.column_name).join(', '));
}

checkSchema().catch(console.error);
