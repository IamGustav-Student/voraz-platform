-- ============================================================
-- FASE 34: GastroRed — Reparación de Codificación UTF-8
-- ============================================================
-- Este script corrige los caracteres corrompidos por errores de encoding
-- en todas las entidades del sistema (Comercios, Productos, Noticias, etc).
-- Es seguro ejecutarlo múltiples veces (idempotente).

-- 1. Reparar Categorías
UPDATE categories SET name = REPLACE(name, 'Ã¡', 'á') WHERE name LIKE '%Ã¡%';
UPDATE categories SET name = REPLACE(name, 'Ã©', 'é') WHERE name LIKE '%Ã©%';
UPDATE categories SET name = REPLACE(name, 'Ã­', 'í') WHERE name LIKE '%Ã­%';
UPDATE categories SET name = REPLACE(name, 'Ã³', 'ó') WHERE name LIKE '%Ã³%';
UPDATE categories SET name = REPLACE(name, 'Ãº', 'ú') WHERE name LIKE '%Ãº%';
UPDATE categories SET name = REPLACE(name, 'Ã±', 'ñ') WHERE name LIKE '%Ã±%';
UPDATE categories SET name = REPLACE(name, 'Ã‘', 'Ñ') WHERE name LIKE '%Ã‘%';
UPDATE categories SET name = REPLACE(name, 'Â¿', '¿') WHERE name LIKE '%Â¿%';
UPDATE categories SET name = REPLACE(name, 'Âº', 'º') WHERE name LIKE '%Âº%';

-- 2. Reparar Productos
UPDATE products SET name = REPLACE(name, 'Ã¡', 'á') WHERE name LIKE '%Ã¡%';
UPDATE products SET name = REPLACE(name, 'Ã©', 'é') WHERE name LIKE '%Ã©%';
UPDATE products SET name = REPLACE(name, 'Ã­', 'í') WHERE name LIKE '%Ã­%';
UPDATE products SET name = REPLACE(name, 'Ã³', 'ó') WHERE name LIKE '%Ã³%';
UPDATE products SET name = REPLACE(name, 'Ãº', 'ú') WHERE name LIKE '%Ãº%';
UPDATE products SET name = REPLACE(name, 'Ã±', 'ñ') WHERE name LIKE '%Ã±%';
UPDATE products SET name = REPLACE(name, 'Ã‘', 'Ñ') WHERE name LIKE '%Ã‘%';

UPDATE products SET description = REPLACE(description, 'Ã¡', 'á') WHERE description LIKE '%Ã¡%';
UPDATE products SET description = REPLACE(description, 'Ã©', 'é') WHERE description LIKE '%Ã©%';
UPDATE products SET description = REPLACE(description, 'Ã­', 'í') WHERE description LIKE '%Ã­%';
UPDATE products SET description = REPLACE(description, 'Ã³', 'ó') WHERE description LIKE '%Ã³%';
UPDATE products SET description = REPLACE(description, 'Ãº', 'ú') WHERE description LIKE '%Ãº%';
UPDATE products SET description = REPLACE(description, 'Ã±', 'ñ') WHERE description LIKE '%Ã±%';
UPDATE products SET description = REPLACE(description, 'Ã‘', 'Ñ') WHERE description LIKE '%Ã‘%';

UPDATE products SET badge = REPLACE(badge, 'Ã¡', 'á') WHERE badge LIKE '%Ã¡%';
UPDATE products SET badge = REPLACE(badge, 'Ã©', 'é') WHERE badge LIKE '%Ã©%';
UPDATE products SET badge = REPLACE(badge, 'Ã±', 'ñ') WHERE badge LIKE '%Ã±%';

-- 3. Reparar Tenants (Comercios SaaS)
UPDATE tenants SET brand_name = REPLACE(brand_name, 'Ã¡', 'á') WHERE brand_name LIKE '%Ã¡%';
UPDATE tenants SET brand_name = REPLACE(brand_name, 'Ã©', 'é') WHERE brand_name LIKE '%Ã©%';
UPDATE tenants SET brand_name = REPLACE(brand_name, 'Ã­', 'í') WHERE brand_name LIKE '%Ã­%';
UPDATE tenants SET brand_name = REPLACE(brand_name, 'Ã³', 'ó') WHERE brand_name LIKE '%Ã³%';
UPDATE tenants SET brand_name = REPLACE(brand_name, 'Ãº', 'ú') WHERE brand_name LIKE '%Ãº%';
UPDATE tenants SET brand_name = REPLACE(brand_name, 'Ã±', 'ñ') WHERE brand_name LIKE '%Ã±%';
UPDATE tenants SET brand_name = REPLACE(brand_name, 'Ã‘', 'Ñ') WHERE brand_name LIKE '%Ã‘%';

UPDATE tenants SET name = REPLACE(name, 'Ã¡', 'á') WHERE name LIKE '%Ã¡%';
UPDATE tenants SET name = REPLACE(name, 'Ã©', 'é') WHERE name LIKE '%Ã©%';
UPDATE tenants SET name = REPLACE(name, 'Ã±', 'ñ') WHERE name LIKE '%Ã±%';

UPDATE tenants SET slogan = REPLACE(slogan, 'Ã¡', 'á') WHERE slogan LIKE '%Ã¡%';
UPDATE tenants SET slogan = REPLACE(slogan, 'Ã©', 'é') WHERE slogan LIKE '%Ã©%';
UPDATE tenants SET slogan = REPLACE(slogan, 'Ã­', 'í') WHERE slogan LIKE '%Ã­%';
UPDATE tenants SET slogan = REPLACE(slogan, 'Ã³', 'ó') WHERE slogan LIKE '%Ã³%';
UPDATE tenants SET slogan = REPLACE(slogan, 'Ãº', 'ú') WHERE slogan LIKE '%Ãº%';
UPDATE tenants SET slogan = REPLACE(slogan, 'Ã±', 'ñ') WHERE slogan LIKE '%Ã±%';

UPDATE tenants SET address = REPLACE(address, 'Ã¡', 'á') WHERE address LIKE '%Ã¡%';
UPDATE tenants SET address = REPLACE(address, 'Ã©', 'é') WHERE address LIKE '%Ã©%';
UPDATE tenants SET address = REPLACE(address, 'Ã­', 'í') WHERE address LIKE '%Ã­%';
UPDATE tenants SET address = REPLACE(address, 'Ã³', 'ó') WHERE address LIKE '%Ã³%';
UPDATE tenants SET address = REPLACE(address, 'Ãº', 'ú') WHERE address LIKE '%Ãº%';
UPDATE tenants SET address = REPLACE(address, 'Ã±', 'ñ') WHERE address LIKE '%Ã±%';

-- 4. Reparar Stores (Sucursales)
UPDATE stores SET name = REPLACE(name, 'Ã¡', 'á') WHERE name LIKE '%Ã¡%';
UPDATE stores SET address = REPLACE(address, 'Ã¡', 'á') WHERE address LIKE '%Ã¡%';
UPDATE stores SET address = REPLACE(address, 'Ã©', 'é') WHERE address LIKE '%Ã©%';
UPDATE stores SET address = REPLACE(address, 'Ã±', 'ñ') WHERE address LIKE '%Ã±%';

-- 5. Reparar Contenido Extra (Noticias, Vídeos)
UPDATE news SET title = REPLACE(title, 'Ã¡', 'á') WHERE title LIKE '%Ã¡%';
UPDATE news SET title = REPLACE(title, 'Ã©', 'é') WHERE title LIKE '%Ã©%';
UPDATE news SET title = REPLACE(title, 'Ã±', 'ñ') WHERE title LIKE '%Ã±%';
UPDATE news SET content = REPLACE(content, 'Ã¡', 'á') WHERE content LIKE '%Ã¡%';

UPDATE community_videos SET title = REPLACE(title, 'Ã¡', 'á') WHERE title LIKE '%Ã¡%';

-- 6. Reparar Pedidos (Notas y Datos de Cliente)
UPDATE orders SET notes = REPLACE(notes, 'Ã¡', 'á') WHERE notes LIKE '%Ã¡%';
UPDATE orders SET customer_name = REPLACE(customer_name, 'Ã¡', 'á') WHERE customer_name LIKE '%Ã¡%';
UPDATE orders SET customer_address = REPLACE(customer_address, 'Ã¡', 'á') WHERE customer_address LIKE '%Ã¡%';

-- 7. Limpieza de datos Maestros (Asegurar IDs base)
UPDATE categories SET name = 'Clásicas' WHERE slug = 'clasicas' AND (store_id = 1 OR store_id IS NULL);
UPDATE categories SET name = 'Papas & Sides' WHERE slug = 'sides' AND (store_id = 1 OR store_id IS NULL);

-- Asegurar cliente UTF8
SET client_encoding TO 'UTF8';
