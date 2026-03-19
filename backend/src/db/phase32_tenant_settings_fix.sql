-- Fase 32: Corrección de restricciones en tenant_settings
-- Eliminar restricción UNIQUE en tenant_id para permitir múltiples locales por tenant

ALTER TABLE tenant_settings DROP CONSTRAINT IF EXISTS tenant_settings_tenant_id_key;

-- Asegurar que store_id sea el identificador único para configuraciones (si no lo es ya)
-- Nota: En FASE 16 ya se usó ON CONFLICT (store_id), lo que implica que existe un índice UNIQUE o PKEY.
-- Si queremos ser explícitos:
-- ALTER TABLE tenant_settings ADD CONSTRAINT tenant_settings_store_id_key UNIQUE (store_id);
