-- ============================================================
-- FASE 37: GastroRed — Reparación GLOBAL de caracteres UTF-8
-- ============================================================
-- Se aplica a TODAS las tablas y TODOS los comercios para asegurar
-- que los datos existentes se vean correctamente.

DO $$
BEGIN
    -- 1. Reparar TENANTS (Todos)
    UPDATE tenants SET 
        brand_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(brand_name, 'Ã¡', 'á'), 'Ã©', 'é'), 'Ã\u00ad', 'í'), 'Ã³', 'ó'), 'Ãº', 'ú'),
        slogan = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(slogan, 'Ã¡', 'á'), 'Ã©', 'é'), 'Ã\u00ad', 'í'), 'Ã³', 'ó'), 'Ãº', 'ú'),
        address = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(address, 'Ã¡', 'á'), 'Ã©', 'é'), 'Ã\u00ad', 'í'), 'Ã³', 'ó'), 'Ãº', 'ú');

    UPDATE tenants SET 
        brand_name = REPLACE(brand_name, 'Ã±', 'ñ'),
        slogan = REPLACE(slogan, 'Ã±', 'ñ'),
        address = REPLACE(address, 'Ã±', 'ñ');

    -- 2. Reparar CATEGORIES (Todas)
    UPDATE categories SET 
        name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, 'Ã¡', 'á'), 'Ã©', 'é'), 'Ã\u00ad', 'í'), 'Ã³', 'ó'), 'Ãº', 'ú');
    UPDATE categories SET name = REPLACE(name, 'Ã±', 'ñ');

    -- 3. Reparar PRODUCTS (Todos)
    UPDATE products SET 
        name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, 'Ã¡', 'á'), 'Ã©', 'é'), 'Ã\u00ad', 'í'), 'Ã³', 'ó'), 'Ãº', 'ú'),
        description = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(description, 'Ã¡', 'á'), 'Ã©', 'é'), 'Ã\u00ad', 'í'), 'Ã³', 'ó'), 'Ãº', 'ú');
    UPDATE products SET 
        name = REPLACE(name, 'Ã±', 'ñ'),
        description = REPLACE(description, 'Ã±', 'ñ');

    -- 4. Reparar STORES (Todas)
    UPDATE stores SET 
        name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, 'Ã¡', 'á'), 'Ã©', 'é'), 'Ã\u00ad', 'í'), 'Ã³', 'ó'), 'Ãº', 'ú'),
        address = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(address, 'Ã¡', 'á'), 'Ã©', 'é'), 'Ã\u00ad', 'í'), 'Ã³', 'ó'), 'Ãº', 'ú');
    UPDATE stores SET 
        name = REPLACE(name, 'Ã±', 'ñ'),
        address = REPLACE(address, 'Ã±', 'ñ');
END $$;
