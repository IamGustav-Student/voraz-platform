-- ============================================================
-- FASE 41: GastroRed — Reparación de Texto Base (Final)
-- ============================================================
-- Se corrigen palabras clave del "texto base" que presentan
-- corrupción de caracteres (acentos y ñ) usando patrones LIKE.

DO $$
BEGIN
    -- 1. Reparar CATEGORÍAS (Global)
    UPDATE categories SET name = 'Clásicas'      WHERE (name ILIKE 'Cl%sicas' OR name ILIKE 'Clsicas');
    UPDATE categories SET name = 'Promociones'   WHERE (name ILIKE 'Promocion%s' OR name ILIKE 'Promocions');
    UPDATE categories SET name = 'Bebidas'       WHERE (name ILIKE 'Bebida%s' OR name ILIKE 'Bebidas');
    UPDATE categories SET name = 'Postres'       WHERE (name ILIKE 'Postre%s' OR name ILIKE 'Postres');
    UPDATE categories SET name = 'Entradas'      WHERE (name ILIKE 'Entrada%s' OR name ILIKE 'Entradas');

    -- 2. Reparar PRODUCTOS (Global)
    -- Corregir la palabra "Medallón" en descripciones
    UPDATE products SET description = REPLACE(description, 'Medalln', 'Medallón');
    UPDATE products SET description = REPLACE(description, 'Medalln', 'Medallón');
    UPDATE products SET description = REPLACE(description, 'panceta', 'panceta'); -- Por las dudas
    
    -- Corregir nombres comunes
    UPDATE products SET name = 'Clásica' WHERE (name ILIKE 'Cl%sica' OR name ILIKE 'Clsica');
    
    -- 3. Reparar TENANTS (Global)
    -- Algunos pudieron haber quedado con nombres corruptos en campos base
    UPDATE tenants SET brand_name = REPLACE(brand_name, '', 'ñ') WHERE brand_name LIKE '%%';
    UPDATE tenants SET brand_name = REPLACE(brand_name, '', 'á') WHERE brand_name LIKE '%%';

    -- 4. Forzar guardado limpio de palabras clave de Voraz (Store 1)
    UPDATE categories SET name = 'Clásicas' WHERE id = (SELECT id FROM categories WHERE store_id = 1 AND slug = 'clasicas-1' LIMIT 1);
    UPDATE products SET description = 'Medallón 180g, lechuga, tomate, cebolla morada y mayonesa.' 
    WHERE store_id = 1 AND name = 'Classic American';

END $$;
