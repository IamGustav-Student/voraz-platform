-- Phase 26: Welcome Bonus Configuration
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS welcome_bonus_points INTEGER DEFAULT 50;
