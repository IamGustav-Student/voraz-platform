-- Fase 21: Ajustes multi-tenant en restricciones únicas (UNIQUE Constraints)
-- Problema: Un tenant nuevo no podía crear la categoría 'Smash' porque el slug chocaba
-- con el store Voraz, ni cupones genéricos como 'BIENVENIDO' porque chocaban la regla UNIQUE global.

-- 1. Categorías: Permitir que distintos tenants tengan cateogrías con el mismo slug (ej: 'smash')
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_slug_key CASCADE;
-- Mantenemos la exclusividad del slug PERO por tienda (cada tenant tiene su propio slug único)
ALTER TABLE categories ADD CONSTRAINT categories_slug_store_id_unique UNIQUE (slug, store_id);

-- 2. Cupones: Permitir que distintos tenants ofrezcan el mismo código de cupón (ej: 'BIENVENIDO')
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_code_key CASCADE;
ALTER TABLE coupons ADD CONSTRAINT coupons_code_store_id_unique UNIQUE (code, store_id);

-- 3. Productos: Por las dudas, validamos que no haya constraints globales en nombre
-- (En productos no existe UNIQUE por defecto, pero lo documentamos).
