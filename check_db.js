import { query } from './backend/src/config/db.js';

async function checkInconsistency() {
  try {
    console.log('--- Checking tenant_settings for tenant_id_fk = 1 ---');
    const res = await query('SELECT * FROM tenant_settings WHERE tenant_id_fk::text = \'1\'');
    console.log(`Found ${res.rows.length} rows:`);
    res.rows.forEach(row => {
      console.log(`Store ID: ${row.store_id}, Tenant ID: ${row.tenant_id}, Orders Paused: ${row.orders_paused}`);
    });

    console.log('\n--- Checking current store and tenant info ---');
    const t = await query('SELECT id, brand_name, subdomain FROM tenants WHERE id::text = \'1\'');
    console.log('Tenant:', t.rows[0]);

    if (res.rows.length > 1) {
      console.log('\n[!] INCONSISTENCY DETECTED: Multiple rows in tenant_settings for the same tenant.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

checkInconsistency();
