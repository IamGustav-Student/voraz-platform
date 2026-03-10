-- migración 19: Agregar columnas faltantes en tablas para evitar errores en Panel de Administración

ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS store_id INTEGER;
UPDATE categories SET store_id = 1 WHERE store_id IS NULL;

ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS badge VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id INTEGER;
UPDATE products SET store_id = 1 WHERE store_id IS NULL;

ALTER TABLE videos ADD COLUMN IF NOT EXISTS store_id INTEGER;
UPDATE videos SET store_id = 1 WHERE store_id IS NULL;

DO $$ 
BEGIN
    BEGIN
        ALTER TABLE news ADD COLUMN IF NOT EXISTS store_id INTEGER;
        UPDATE news SET store_id = 1 WHERE store_id IS NULL;
    EXCEPTION
        WHEN undefined_table THEN
            NULL;
    END;
    
    BEGIN
        ALTER TABLE influencers ADD COLUMN IF NOT EXISTS store_id INTEGER;
        UPDATE influencers SET store_id = 1 WHERE store_id IS NULL;
    EXCEPTION
        WHEN undefined_table THEN
            NULL;
    END;

    BEGIN
        ALTER TABLE coupons ADD COLUMN IF NOT EXISTS store_id INTEGER;
        UPDATE coupons SET store_id = 1 WHERE store_id IS NULL;
    EXCEPTION
        WHEN undefined_table THEN
            NULL;
    END;
END $$;
