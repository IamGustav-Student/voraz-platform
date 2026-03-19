-- Fase 20: Limpiar Base de Datos (Conservar solo Voraz)
-- Este script elimina datos de prueba de tenants que no sean 'voraz'

-- 1. Eliminar datos transaccionales de otros comercios
DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz'));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_status_history') THEN
    DELETE FROM order_status_history WHERE order_id IN (SELECT id FROM orders WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz'));
  END IF;
END $$;

DELETE FROM orders WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz');

-- 2. Eliminar catálogo y usuarios de otros comercios
-- Intentamos con ambos nombres posibles (productos/products) por seguridad
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
    DELETE FROM products WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'productos') THEN
    DELETE FROM productos WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz');
  END IF;
END $$;

DELETE FROM categories WHERE store_id IN (SELECT id FROM stores WHERE tenant_id != 'voraz');

-- 3. Eliminar configuraciones y sucursales
DELETE FROM tenant_settings WHERE tenant_id != 'voraz' AND tenant_id_fk != 'voraz';
DELETE FROM stores WHERE tenant_id != 'voraz';
DELETE FROM tenants WHERE id != 'voraz';
