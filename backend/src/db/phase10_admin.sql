-- Fase 10: Sistema de administración (Backoffice)

-- Agregar rol a usuarios
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'manager'));
  END IF;
END $$;

-- Crear primer admin (se actualiza después con email real)
-- UPDATE users SET role = 'admin' WHERE email = 'admin@voraz.com';

-- Tabla de uploads de imágenes
CREATE TABLE IF NOT EXISTS media_uploads (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) DEFAULT 'voraz',
  url TEXT NOT NULL,
  public_id VARCHAR(200),
  resource_type VARCHAR(20) DEFAULT 'image',
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
