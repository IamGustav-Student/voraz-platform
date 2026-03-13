-- Fase 20: Limpiar Base de Datos (Conservar solo Voraz)

-- 1. Eliminar datos terciarios
DELETE FROM points_history WHERE user_id IN (SELECT id FROM users WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz'));
DELETE FROM coupon_uses WHERE order_id IN (SELECT id FROM orders WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz'));

-- 2. Pedidos y Detalles (Blindaje contra Foreign Key Errors)
-- [NUEVO] Eliminamos los items de pedido asociados a productos que vamos a borrar.
DELETE FROM order_items WHERE product_id IN (SELECT id FROM products WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz'));
-- Eliminamos los items vinculados a las órdenes que vamos a borrar.
DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz'));
-- Ahora sí, borramos las órdenes.
DELETE FROM orders WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz');

-- 3. Catálogo (Productos deben borrarse ANTES de Categorias)
DELETE FROM products WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz');
DELETE FROM categories WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz');

-- 4. Marketing y Comunidad
DELETE FROM influencers WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz');
DELETE FROM videos WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz');
DELETE FROM news WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz');
DELETE FROM coupons WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz');

-- 5. Pagos y Config SaaS
DELETE FROM tenant_settings WHERE tenant_id_fk != 'voraz';
DELETE FROM subscription_payments WHERE tenant_id != 'voraz';

-- 6. Eliminar usuarios vinculados a los tenants de prueba
DELETE FROM users WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz');

-- 7. Eliminar tiendas físicas / sucursales de esos tenants
DELETE FROM stores WHERE tenant_id != 'voraz';

-- 8. Eliminar a los clientes SaaS (Tenants)
DELETE FROM tenants WHERE id != 'voraz';