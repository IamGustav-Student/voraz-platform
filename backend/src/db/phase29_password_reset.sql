-- ── Phase 29: Tabla de tokens para recuperación de contraseñas ──────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(128) NOT NULL,        -- SHA-256 del token aleatorio
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_user_id    ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens(token_hash);

-- Limpieza automática de tokens expirados
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'password_reset_tokens' AND indexname = 'idx_prt_expires_at'
  ) THEN
    CREATE INDEX idx_prt_expires_at ON password_reset_tokens(expires_at);
  END IF;
END $$;
