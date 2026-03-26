-- ============================================================
-- FASE 34: GastroRed — Reparación de Codificación UTF-8
-- ============================================================
-- Este script corrige los caracteres corrompidos por errores de encoding
-- en las tablas principales de la plataforma.

-- 1. Reparar Categorías (Global y Master Store)
UPDATE categories SET name = REPLACE(name, 'Ã¡', 'á') WHERE name LIKE '%Ã¡%';
UPDATE categories SET name = REPLACE(name, 'Ã©', 'é') WHERE name LIKE '%Ã©%';
UPDATE categories SET name = REPLACE(name, 'Ã­', 'í') WHERE name LIKE '%Ã­%';
UPDATE categories SET name = REPLACE(name, 'Ã³', 'ó') WHERE name LIKE '%Ã³%';
UPDATE categories SET name = REPLACE(name, 'Ãº', 'ú') WHERE name LIKE '%Ãº%';
UPDATE categories SET name = REPLACE(name, 'Ã±', 'ñ') WHERE name LIKE '%Ã±%';
UPDATE categories SET name = REPLACE(name, 'Ã‘', 'Ñ') WHERE name LIKE '%Ã‘%';
UPDATE categories SET name = REPLACE(name, 'Â¿', '¿') WHERE name LIKE '%Â¿%';
UPDATE categories SET name = REPLACE(name, 'Âº', 'º') WHERE name LIKE '%Âº%';

-- 2. Reparar Productos (Nombres y Descripciones)
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

-- 3. Reparar Tenants (Nombres de Marca y Slogans)
UPDATE tenants SET brand_name = REPLACE(brand_name, 'Ã¡', 'á') WHERE brand_name LIKE '%Ã¡%';
UPDATE tenants SET brand_name = REPLACE(brand_name, 'Ã©', 'é') WHERE brand_name LIKE '%Ã©%';
UPDATE tenants SET brand_name = REPLACE(brand_name, 'Ã­', 'í') WHERE brand_name LIKE '%Ã­%';
UPDATE tenants SET brand_name = REPLACE(brand_name, 'Ã³', 'ó') WHERE brand_name LIKE '%Ã³%';
UPDATE tenants SET brand_name = REPLACE(brand_name, 'Ãº', 'ú') WHERE brand_name LIKE '%Ãº%';
UPDATE tenants SET brand_name = REPLACE(brand_name, 'Ã±', 'ñ') WHERE brand_name LIKE '%Ã±%';
UPDATE tenants SET brand_name = REPLACE(brand_name, 'Ã‘', 'Ñ') WHERE brand_name LIKE '%Ã‘%';

UPDATE tenants SET slogan = REPLACE(slogan, 'Ã¡', 'á') WHERE slogan LIKE '%Ã¡%';
UPDATE tenants SET slogan = REPLACE(slogan, 'Ã©', 'é') WHERE slogan LIKE '%Ã©%';
UPDATE tenants SET slogan = REPLACE(slogan, 'Ã­', 'í') WHERE slogan LIKE '%Ã­%';
UPDATE tenants SET slogan = REPLACE(slogan, 'Ã³', 'ó') WHERE slogan LIKE '%Ã³%';
UPDATE tenants SET slogan = REPLACE(slogan, 'Ãº', 'ú') WHERE slogan LIKE '%Ãº%';
UPDATE tenants SET slogan = REPLACE(slogan, 'Ã±', 'ñ') WHERE slogan LIKE '%Ã±%';
UPDATE tenants SET slogan = REPLACE(slogan, 'Ã‘', 'Ñ') WHERE slogan LIKE '%Ã‘%';

-- 4. Asegurar que los datos de la Tienda Maestra (ID 1) sean correctos
UPDATE categories SET name = 'Clásicas' WHERE slug = 'clasicas' AND (store_id = 1 OR store_id IS NULL);
UPDATE categories SET name = 'Papas & Sides' WHERE slug = 'sides' AND (store_id = 1 OR store_id IS NULL);

-- 5. Forzar la codificación cliente a UTF8 en la sesión de base de datos
SET client_encoding TO 'UTF8';
