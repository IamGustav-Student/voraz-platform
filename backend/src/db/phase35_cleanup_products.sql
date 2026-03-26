-- ============================================================
-- FASE 35: GastroRed — Limpieza de Productos y Duplicados
-- ============================================================
-- Este script realiza una limpieza profunda del catálogo:
-- 1. Elimina productos duplicados exactos (mismo nombre, categoría y tienda).
-- 2. Limita cada categoría de cada tienda a un máximo de 2 productos.

-- 1. Eliminar duplicados exactos (mismo nombre en la misma categoría y tienda)
-- SOLO para el comercio base (ID 1)
DELETE FROM products a USING products b
WHERE a.id > b.id 
  AND a.name = b.name 
  AND a.category_id = b.category_id 
  AND a.store_id = 1 
  AND b.store_id = 1;

-- 2. Limitar a máximo 2 productos por categoría por tienda
-- SOLO para el comercio base (ID 1)
WITH ranked_products AS (
    SELECT id, 
           ROW_NUMBER() OVER (
               PARTITION BY category_id 
               ORDER BY created_at ASC, id ASC
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

-- 3. Limpieza de categorías sin productos (Opcional, pero recomendado para orden)
-- Solo si se desea, pero por ahora mantenemos las categorías vacías.
