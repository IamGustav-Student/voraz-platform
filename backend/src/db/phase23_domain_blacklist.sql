-- ============================================================
-- FASE 23: GastroRed — Historial de Dominios y Subdominios
-- ============================================================

-- Tabla para registrar qué dominios/subdominios ya usaron el Trial
-- para impedir que sean registrados nuevamente en un plan gratuito
-- aunque el comercio original haya sido eliminado.

CREATE TABLE IF NOT EXISTS trial_domain_history (
  id            SERIAL PRIMARY KEY,
  type          VARCHAR(20) NOT NULL, -- 'subdomain', 'custom_domain', 'name'
  value         VARCHAR(255) UNIQUE NOT NULL,
  original_tenant_id VARCHAR(100),
  registered_at TIMESTAMP DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_trial_history_value ON trial_domain_history(value);
