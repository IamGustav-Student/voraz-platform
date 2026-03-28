import { query } from './src/config/db.js';

async function checkInconsistency() {
  try {
    console.log('--- Checking tenant_settings for tenant_id_fk = 1 ---');
    const res = await query("SELECT id, store_id, tenant_id, tenant_id_fk, orders_paused FROM tenant_settings WHERE tenant_id_fk::text = '1'");
    console.log(`Found ${res.rows.length} rows:`);
    res.rows.forEach(row => {
      console.log(`Row ID: ${row.id}, Store ID: ${row.store_id}, Tenant ID (old): ${row.tenant_id}, Tenant ID (fk): ${row.tenant_id_fk}, Orders Paused: ${row.orders_paused}`);
    });

    console.log('\n--- Checking current store and tenant info ---');
    const t = await query("SELECT id, brand_name, subdomain FROM tenants WHERE id::text = '1'");
    console.log('Tenant:', t.rows[0]);

    const s = await query("SELECT id, name FROM stores WHERE tenant_id::text = '1' OR tenant_id::text = 'voraz'");
    console.log('Stores for this tenant:');
    s.rows.forEach(store => console.log(` - ID: ${store.id}, Name: ${store.name}`));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

checkInconsistency();
