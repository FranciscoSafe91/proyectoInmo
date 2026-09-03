-- Migración: agregar created_by_user_id a propiedades
ALTER TABLE propiedades
  ADD COLUMN IF NOT EXISTS created_by_user_id VARCHAR(36) REFERENCES usuarios(id) ON DELETE SET NULL;
