import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Usando la misma configuración que index.js para Railway
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        user: process.env.DB_USER || 'voraz_admin',
        password: process.env.DB_PASSWORD || 'voraz_password_secure',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5433,
        database: process.env.DB_NAME || 'voraz_db',
      }
);

async function cleanAllTenants() {
  console.log('🧹 Iniciando limpieza de base de datos (eliminando tenants de prueba SaaS, dejando solo configuración base de Voraz)...');
  
  try {
    const resTenants = await pool.query("SELECT id FROM tenants WHERE id != 'voraz'");
    const tenantIdsToClean = resTenants.rows.map(t => t.id);
    
    if (tenantIdsToClean.length === 0) {
      console.log('✅ No hay tenants SaaS para eliminar. La base ya está limpia.');
      process.exit(0);
    }
    
    console.log(`🗑️ Se eliminarán los datos vinculados de los siguientes tenants: ${tenantIdsToClean.join(', ')}`);

    // 1. Eliminar datos terciarios
    try { await pool.query(`DELETE FROM points_history WHERE user_id IN (SELECT id FROM users WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz'))`); } catch (e) {}
    try { await pool.query(`DELETE FROM coupon_uses WHERE order_id IN (SELECT id FROM orders WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz'))`); } catch (e) {}
    
    // 2. Pedidos
    await pool.query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz'))`);
    await pool.query(`DELETE FROM orders WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz')`);
    
    // 3. Catálogo (Productos deben borrarse ANTES de Categorias)
    await pool.query(`DELETE FROM products WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz')`);
    await pool.query(`DELETE FROM categories WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz')`);
    
    // 4. Marketing y Comunidad
    await pool.query(`DELETE FROM influencers WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz')`);
    await pool.query(`DELETE FROM videos WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz')`);
    await pool.query(`DELETE FROM news WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz')`);
    await pool.query(`DELETE FROM coupons WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz')`);

    // 5. Pagos y Config SaaS
    try { await pool.query(`DELETE FROM tenant_settings WHERE tenant_id_fk != 'voraz'`); } catch(e){}
    try { await pool.query(`DELETE FROM subscription_payments WHERE tenant_id != 'voraz'`); } catch(e){}

    // 6. Eliminar usuarios vinculados a los tenants de prueba
    try { await pool.query(`DELETE FROM users WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz')`); } catch(e){}

    // 7. Eliminar tiendas físicas / sucursales de esos tenants
    await pool.query(`DELETE FROM stores WHERE tenant_id != 'voraz'`);

    // 8. Eliminar a los clientes SaaS (Tenants)
    await pool.query(`DELETE FROM tenants WHERE id != 'voraz'`);

    console.log('✅ Limpieza completada exitosamente. Tu base de datos está libre de clientes de prueba, lista para salir a producción.');

  } catch (error) {
    console.error('❌ Error limpiando la base de datos:', error.message);
  } finally {
    await pool.end();
  }
}

cleanAllTenants();
