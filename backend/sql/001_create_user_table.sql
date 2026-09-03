-- Ejecutar una sola vez en la base de datos "spiderconnect":
--   psql -U postgres -d spiderconnect -f backend/sql/001_create_user_table.sql
--
-- Nota: la tabla se llama "usuarios" (no "user") porque "user" es
-- una palabra reservada en PostgreSQL y causa conflictos en los clientes.

CREATE TABLE IF NOT EXISTS usuarios (
  id            VARCHAR(36)   PRIMARY KEY,
  agency_id     VARCHAR(36),
  nombre        VARCHAR(255)  NOT NULL,
  apellido      VARCHAR(255)  NOT NULL DEFAULT '',
  documento     VARCHAR(100)  NOT NULL DEFAULT '',
  email         VARCHAR(255)  UNIQUE NOT NULL,
  account_type  VARCHAR(50)   NOT NULL DEFAULT 'inmobiliaria',
  agency_name   VARCHAR(255)  NOT NULL DEFAULT '',
  direccion     VARCHAR(500)  NOT NULL DEFAULT '',
  username      VARCHAR(100)  NOT NULL DEFAULT '',
  password_hash TEXT          NOT NULL,
  password_salt VARCHAR(100)  NOT NULL,
  role          VARCHAR(50)   NOT NULL DEFAULT 'admin',
  is_platform_admin BOOLEAN   NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
