-- ============================================================
-- FASE 34: GastroRed — Reparación de Codificación UTF-8
-- ============================================================
-- Este script corrige los caracteres corrompidos por errores de encoding
-- en todas las entidades del sistema (Comercios, Productos, Noticias, etc).
-- Es seguro ejecutarlo múltiples veces (idempotente).-- 1. Reparar Categorías (Solo Master Store/Base)
UPDATE categories SET name = REPLACE(name, 'Ã¡', 'á') WHERE name LIKE '%Ã¡%' AND (store_id = 1 OR store_id IS NULL);
UPDATE categories SET name = REPLACE(name, 'Ã©', 'é') WHERE name LIKE '%Ã©%' AND (store_id = 1 OR store_id IS NULL);
UPDATE categories SET name = REPLACE(name, 'Ã­', 'í') WHERE name LIKE '%Ã­%' AND (store_id = 1 OR store_id IS NULL);
UPDATE categories SET name = REPLACE(name, 'Ã³', 'ó') WHERE name LIKE '%Ã³%' AND (store_id = 1 OR store_id IS NULL);
UPDATE categories SET name = REPLACE(name, 'Ãº', 'ú') WHERE name LIKE '%Ãº%' AND (store_id = 1 OR store_id IS NULL);
UPDATE categories SET name = REPLACE(name, 'Ã±', 'ñ') WHERE name LIKE '%Ã±%' AND (store_id = 1 OR store_id IS NULL);
UPDATE categories SET name = REPLACE(name, 'Ã‘', 'Ñ') WHERE name LIKE '%Ã‘%' AND (store_id = 1 OR store_id IS NULL);
UPDATE categories SET name = REPLACE(name, 'Â¿', '¿') WHERE name LIKE '%Â¿%' AND (store_id = 1 OR store_id IS NULL);
UPDATE categories SET name = REPLACE(name, 'Âº', 'º') WHERE name LIKE '%Âº%' AND (store_id = 1 OR store_id IS NULL);

-- 2. Reparar Productos (Solo Master Store/Base)
UPDATE products SET name = REPLACE(name, 'Ã¡', 'á') WHERE name LIKE '%Ã¡%' AND store_id = 1;
UPDATE products SET name = REPLACE(name, 'Ã©', 'é') WHERE name LIKE '%Ã©%' AND store_id = 1;
UPDATE products SET name = REPLACE(name, 'Ã­', 'í') WHERE name LIKE '%Ã­%' AND store_id = 1;
UPDATE products SET name = REPLACE(name, 'Ã³', 'ó') WHERE name LIKE '%Ã³%' AND store_id = 1;
UPDATE products SET name = REPLACE(name, 'Ãº', 'ú') WHERE name LIKE '%Ãº%' AND store_id = 1;
UPDATE products SET name = REPLACE(name, 'Ã±', 'ñ') WHERE name LIKE '%Ã±%' AND store_id = 1;

UPDATE products SET description = REPLACE(description, 'Ã¡', 'á') WHERE description LIKE '%Ã¡%' AND store_id = 1;
UPDATE products SET description = REPLACE(description, 'Ã©', 'é') WHERE description LIKE '%Ã©%' AND store_id = 1;
UPDATE products SET description = REPLACE(description, 'Ã­', 'í') WHERE description LIKE '%Ã­%' AND store_id = 1;
UPDATE products SET description = REPLACE(description, 'Ã³', 'ó') WHERE description LIKE '%Ã³%' AND store_id = 1;
UPDATE products SET description = REPLACE(description, 'Ãº', 'ú') WHERE description LIKE '%Ãº%' AND store_id = 1;
UPDATE products SET description = REPLACE(description, 'Ã±', 'ñ') WHERE description LIKE '%Ã±%' AND store_id = 1;

UPDATE products SET badge = REPLACE(badge, 'Ã¡', 'á') WHERE badge LIKE '%Ã¡%' AND store_id = 1;

-- 3. Reparar Tienda Base y Master (Nombres y Slogans específicos)
UPDATE stores SET name = 'Voraz' WHERE id = 1 AND name LIKE '%Voraz%';
UPDATE stores SET address = REPLACE(address, 'Ã¡', 'á') WHERE address LIKE '%Ã¡%' AND id = 1;

UPDATE tenants SET brand_name = 'Voraz' WHERE id = 'voraz' AND brand_name LIKE '%Voraz%';
UPDATE tenants SET slogan = REPLACE(slogan, 'Ã¡', 'á') WHERE slogan LIKE '%Ã¡%' AND (id = 'voraz' OR id = '1');

-- 4. Reparar Contenido Extra en Tienda Base
UPDATE news SET title = REPLACE(title, 'Ã¡', 'á') WHERE title LIKE '%Ã¡%' AND store_id = 1;
UPDATE news SET content = REPLACE(content, 'Ã¡', 'á') WHERE content LIKE '%Ã¡%' AND store_id = 1;

-- 5. Asegurar datos exactos para categorías base
UPDATE categories SET name = 'Clásicas' WHERE slug = 'clasicas' AND (store_id = 1 OR store_id IS NULL);
UPDATE categories SET name = 'Papas & Sides' WHERE slug = 'sides' AND (store_id = 1 OR store_id IS NULL);

-- Finalizar sesión forzando UTF8
SET client_encoding TO 'UTF8';
 Limpieza de datos Maestros (Asegurar IDs base)
UPDATE categories SET name = 'Clásicas' WHERE slug = 'clasicas' AND (store_id = 1 OR store_id IS NULL);
UPDATE categories SET name = 'Papas & Sides' WHERE slug = 'sides' AND (store_id = 1 OR store_id IS NULL);

-- Asegurar cliente UTF8
SET client_encoding TO 'UTF8';
