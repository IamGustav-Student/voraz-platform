-- ============================================================
-- FASE 35: GastroRed — Limpieza AGRESIVA de Duplicados
-- ============================================================
-- Este script realiza una limpieza profunda para eliminar duplicados
-- que puedan haber surgido por múltiples ejecuciones de seeds.
-- Se enfoca únicamente en el comercio base (ID 1).

-- 0. FUSIONAR CATEGORÍAS DUPLICADAS en el comercio base (ID 1)
-- Normalizamos nombres con TRIM y LOWER para encontrar duplicados "invisibles".
DO $$
DECLARE
    cat_rec RECORD;
BEGIN
    FOR cat_rec IN (
        SELECT TRIM(LOWER(name)) as clean_name, MIN(id) as first_id
        FROM categories 
        WHERE store_id = 1
        GROUP BY TRIM(LOWER(name))
        HAVING COUNT(*) > 1
    ) LOOP
        -- Mover productos de las categorías duplicadas a la categoría 'principal'
        UPDATE products 
        SET category_id = cat_rec.first_id
        WHERE category_id IN (
            SELECT id FROM categories 
            WHERE TRIM(LOWER(name)) = cat_rec.clean_name AND store_id = 1 AND id <> cat_rec.first_id
        ) AND store_id = 1;
        
        -- Borrar las categorías duplicadas ahora vacías
        DELETE FROM categories 
        WHERE TRIM(LOWER(name)) = cat_rec.clean_name AND store_id = 1 AND id <> cat_rec.first_id;
    END LOOP;
END $$;

-- 1. ELIMINAR PRODUCTOS DUPLICADOS basado en nombre normalizado (TRIM + LOWER)
-- Nos aseguramos que dos productos con el mismo nombre en la misma categoría no coexistan.
DELETE FROM products a USING products b
WHERE a.id > b.id 
  AND TRIM(LOWER(a.name)) = TRIM(LOWER(b.name)) 
  AND a.category_id = b.category_id 
  AND a.store_id = 1 
  AND b.store_id = 1;

-- 2. LIMITAR A MÁXIMO 2 PRODUCTOS POR CATEGORÍA en el comercio base (ID 1)
WITH ranked_products AS (
    SELECT id, 
           ROW_NUMBER() OVER (
               PARTITION BY category_id 
               ORDER BY id ASC
           ) as pos
    FROM products
    WHERE store_id = 1
)
DELETE FROM products
WHERE id IN (
    SELECT id 
    FROM ranked_products 
    WHERE pos > 2
);

-- 3. LIMPIEZA FINAL de categorías huérfanas en tienda 1
DELETE FROM categories 
WHERE store_id = 1 
  AND id NOT IN (SELECT DISTINCT category_id FROM products WHERE category_id IS NOT NULL);
