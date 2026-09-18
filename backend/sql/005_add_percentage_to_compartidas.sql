-- Agrega columna porcentaje a la tabla compartidas
ALTER TABLE compartidas ADD COLUMN IF NOT EXISTS percentage DECIMAL(5,2) DEFAULT NULL;
