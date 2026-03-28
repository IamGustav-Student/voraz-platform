import { query } from '../config/db.js';

/**
 * Inicializa un nuevo tenant con datos de ejemplo (2 productos por categoría)
 * tomando como base el tenant 'voraz' (store_id=1).
 */
export async function initializeTenantData(tenantId, storeId) {
  try {
    console.log(`[Init] --- Iniciando clonación de catálogo base para: ${tenantId} (Sucursal: ${storeId}) ---`);

    // 1. Obtener categorías de la tienda base (Gastro Red, store_id=1)
    const baseCategories = await query('SELECT name, slug, description, image_url FROM categories WHERE store_id = 1');
    
    if (baseCategories.rows.length === 0) {
      console.warn(`[Init] ADVERTENCIA: El comercio base (ID=1) no tiene categorías. El nuevo comercio iniciará vacío.`);
      return true; // No es un error crítico, solo no hay nada que copiar
    }

    console.log(`[Init] Copiando ${baseCategories.rows.length} categorías...`);

    for (const cat of baseCategories.rows) {
      // 2. Crear categoría para el nuevo tenant
      const catResult = await query(
        `INSERT INTO categories (name, slug, description, image_url, store_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug, store_id) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [cat.name, cat.slug, cat.description, cat.image_url, storeId]
      );
      
      if (!catResult.rows.length) continue;
      const newCatId = catResult.rows[0].id;

      // 3. Obtener hasta 2 productos de esta categoría desde la tienda base
      const baseProducts = await query(
        `SELECT p.name, p.description, p.price, p.image_url, p.badge, p.stock
         FROM products p
         JOIN categories c ON p.category_id = c.id
         WHERE c.slug = $1 AND p.store_id = 1 AND p.deleted_at IS NULL
         LIMIT 2`,
        [cat.slug]
      );

      if (baseProducts.rows.length > 0) {
        console.log(`[Init]   -> "${cat.name}": Copiando ${baseProducts.rows.length} productos.`);
        for (const prod of baseProducts.rows) {
          await query(
            `INSERT INTO products (name, description, price, category_id, image_url, badge, store_id, stock)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [prod.name, prod.description, prod.price, newCatId, prod.image_url, prod.badge, storeId, prod.stock]
          );
        }
      }
    }

    console.log(`[Init] ✅ Clonación finalizada exitosamente para ${tenantId}.`);
    return true;
  } catch (error) {
    console.error(`[Init] ❌ ERROR CRÍTICO inicializando datos para ${tenantId}:`, error.message);
    return false;
  }
}
