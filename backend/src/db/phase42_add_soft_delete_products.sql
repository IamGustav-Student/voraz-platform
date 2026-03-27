-- ============================================================
-- FASE 42: GastroRed — Soft Delete para Productos
-- ============================================================
-- Agrega soporte para borrado lógico (soft delete) en la tabla de productos.

-- 1. Agregar columna deleted_at
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. (Opcional) Índices para optimizar búsquedas de productos no borrados
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products (deleted_at) WHERE deleted_at IS NULL;
