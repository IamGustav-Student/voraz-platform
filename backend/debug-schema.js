import { pool } from './src/config/db.js';

async function run() {
    try {
        const prod = await pool.query("SELECT * FROM products LIMIT 1");
        console.log("Product Schema:", Object.keys(prod.rows[0] || {}));
        const cat = await pool.query("SELECT * FROM categories LIMIT 1");
        console.log("Category Schema:", Object.keys(cat.rows[0] || {}));
        const store = await pool.query("SELECT * FROM stores LIMIT 1");
        console.log("Store Schema:", Object.keys(store.rows[0] || {}));
        const tenant = await pool.query("SELECT * FROM tenants LIMIT 1");
        console.log("Tenant Schema:", Object.keys(tenant.rows[0] || {}));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
