-- =============================================================================
-- SpiderConect — Script completo de base de datos
-- =============================================================================
-- Instrucciones:
--
--   1. Crear la base de datos (solo la primera vez):
--        psql -U postgres -c "CREATE DATABASE spiderconnect;"
--
--   2. Ejecutar este script:
--        psql -U postgres -d spiderconnect -f backend/sql/000_setup_completo.sql
--
--   En Windows (PowerShell):
--        $env:PGPASSWORD = "root"
--        psql -U postgres -c "CREATE DATABASE spiderconnect;"
--        psql -U postgres -d spiderconnect -f backend/sql/000_setup_completo.sql
--
-- El script usa IF NOT EXISTS en todas las tablas, por lo que es seguro
-- ejecutarlo varias veces sin borrar datos existentes.
-- =============================================================================


-- =============================================================================
-- TABLA: inmobiliarias
-- Almacena cada agencia / agente independiente registrado en la plataforma.
-- =============================================================================
CREATE TABLE IF NOT EXISTS inmobiliarias (
  id            VARCHAR(36)  PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(255) UNIQUE NOT NULL,
  email         VARCHAR(255) NOT NULL,
  phone         VARCHAR(100) DEFAULT '',
  city          VARCHAR(255) DEFAULT '',
  account_type  VARCHAR(50)  DEFAULT 'inmobiliaria',  -- 'inmobiliaria' | 'agente_independiente'
  logo_path     VARCHAR(500),
  brand_color   VARCHAR(7)   DEFAULT '#1f6f54',
  api_key       VARCHAR(100),
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);


-- =============================================================================
-- TABLA: usuarios
-- Miembros de cada inmobiliaria (admins y agentes).
-- Nota: la tabla se llama "usuarios" (no "user") porque USER es palabra
-- reservada en PostgreSQL y causa problemas en pgAdmin y psql.
-- =============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id                VARCHAR(36)   PRIMARY KEY,
  agency_id         VARCHAR(36),                             -- FK lógica a inmobiliarias.id
  nombre            VARCHAR(255)  NOT NULL,
  apellido          VARCHAR(255)  NOT NULL DEFAULT '',
  documento         VARCHAR(100)  NOT NULL DEFAULT '',
  email             VARCHAR(255)  UNIQUE NOT NULL,
  account_type      VARCHAR(50)   NOT NULL DEFAULT 'inmobiliaria',  -- tipo elegido en el registro
  agency_name       VARCHAR(255)  NOT NULL DEFAULT '',
  direccion         VARCHAR(500)  NOT NULL DEFAULT '',
  username          VARCHAR(100)  NOT NULL DEFAULT '',
  password_hash     TEXT          NOT NULL,
  password_salt     VARCHAR(100)  NOT NULL,
  role              VARCHAR(50)   NOT NULL DEFAULT 'admin',  -- 'admin' | 'agente'
  is_platform_admin BOOLEAN       NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- TABLA: sesiones
-- Tokens de sesión (cookies HttpOnly) para autenticación.
-- =============================================================================
CREATE TABLE IF NOT EXISTS sesiones (
  token      VARCHAR(36)  PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);


-- =============================================================================
-- TABLA: propiedades
-- Listados inmobiliarios de cada agencia.
-- =============================================================================
CREATE TABLE IF NOT EXISTS propiedades (
  id                  VARCHAR(36)  PRIMARY KEY,
  agency_id           VARCHAR(36)  NOT NULL REFERENCES inmobiliarias(id) ON DELETE CASCADE,
  created_by_user_id  VARCHAR(36)  REFERENCES usuarios(id) ON DELETE SET NULL,
  title               VARCHAR(500) NOT NULL,
  description         TEXT         DEFAULT '',
  operation           VARCHAR(50),                   -- 'venta' | 'alquiler' | 'alquiler_temporal'
  type                VARCHAR(50),                   -- 'casa' | 'departamento' | 'local' | etc.
  price               NUMERIC      DEFAULT 0,
  currency            VARCHAR(10)  DEFAULT 'USD',    -- 'USD' | 'ARS'
  address             VARCHAR(500) DEFAULT '',
  city                VARCHAR(255) DEFAULT '',
  province            VARCHAR(255) DEFAULT '',
  bedrooms            INTEGER      DEFAULT 0,
  bathrooms           INTEGER      DEFAULT 0,
  area_m2             NUMERIC      DEFAULT 0,
  status              VARCHAR(50)  DEFAULT 'publicada',  -- 'publicada' | 'pausada' | 'vendida'
  created_at          TIMESTAMPTZ  DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  DEFAULT NOW()
);


-- =============================================================================
-- TABLA: sociedades
-- Alianzas entre inmobiliarias para compartir propiedades.
-- =============================================================================
CREATE TABLE IF NOT EXISTS sociedades (
  id           VARCHAR(36) PRIMARY KEY,
  agency_a_id  VARCHAR(36) NOT NULL REFERENCES inmobiliarias(id) ON DELETE CASCADE,
  agency_b_id  VARCHAR(36) NOT NULL REFERENCES inmobiliarias(id) ON DELETE CASCADE,
  requested_by VARCHAR(36),                  -- id de la agencia que envió la solicitud
  status       VARCHAR(50) DEFAULT 'pendiente',  -- 'pendiente' | 'aceptada' | 'rechazada'
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);


-- =============================================================================
-- TABLA: compartidas
-- Propiedades compartidas de una agencia a otra dentro de una sociedad.
-- =============================================================================
CREATE TABLE IF NOT EXISTS compartidas (
  id                     VARCHAR(36) PRIMARY KEY,
  property_id            VARCHAR(36) NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
  owner_agency_id        VARCHAR(36) NOT NULL REFERENCES inmobiliarias(id) ON DELETE CASCADE,
  target_agency_id       VARCHAR(36) NOT NULL REFERENCES inmobiliarias(id) ON DELETE CASCADE,
  status                 VARCHAR(50) DEFAULT 'pendiente',  -- 'pendiente' | 'aceptada' | 'rechazada'
  web_publish_authorized BOOLEAN     DEFAULT false,        -- si la agencia receptora puede publicar en su web
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  responded_at           TIMESTAMPTZ
);


-- =============================================================================
-- TABLA: alertas_busqueda
-- Alertas que configuran las agencias para recibir propiedades de socios.
-- =============================================================================
CREATE TABLE IF NOT EXISTS alertas_busqueda (
  id           VARCHAR(36)  PRIMARY KEY,
  agency_id    VARCHAR(36)  NOT NULL REFERENCES inmobiliarias(id) ON DELETE CASCADE,
  title        VARCHAR(255) DEFAULT '',
  operation    VARCHAR(50)  DEFAULT '',    -- '' = cualquiera | 'venta' | 'alquiler'
  type         VARCHAR(50)  DEFAULT '',    -- '' = cualquiera | 'casa' | 'departamento'
  city         VARCHAR(255) DEFAULT '',
  currency     VARCHAR(10)  DEFAULT '',
  min_price    NUMERIC,
  max_price    NUMERIC,
  min_bedrooms INTEGER,
  active       BOOLEAN      DEFAULT true,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);


-- =============================================================================
-- TABLA: plan_suscripcion
-- Tabla de una sola fila con el precio del plan mensual (configurable por admin).
-- =============================================================================
CREATE TABLE IF NOT EXISTS plan_suscripcion (
  id        INTEGER PRIMARY KEY DEFAULT 1,
  name      VARCHAR(255) DEFAULT 'Plan Mensual',
  price_ars NUMERIC      DEFAULT 15000
);


-- =============================================================================
-- TABLA: suscripciones
-- Estado de suscripción de cada agencia (trial, activa, vencida, cancelada).
-- =============================================================================
CREATE TABLE IF NOT EXISTS suscripciones (
  id                  VARCHAR(36) PRIMARY KEY,
  agency_id           VARCHAR(36) NOT NULL REFERENCES inmobiliarias(id) ON DELETE CASCADE,
  status              VARCHAR(50) DEFAULT 'trial',  -- 'trial' | 'activa' | 'vencida' | 'cancelada'
  trial_ends_at       TIMESTAMPTZ,
  current_period_end  TIMESTAMPTZ,
  mp_preapproval_id   VARCHAR(255),                 -- ID de suscripción recurrente en Mercado Pago
  created_at          TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
-- TABLA: pagos
-- Historial de pagos aprobados por Mercado Pago u otros medios.
-- =============================================================================
CREATE TABLE IF NOT EXISTS pagos (
  id              VARCHAR(36) PRIMARY KEY,
  agency_id       VARCHAR(36) NOT NULL REFERENCES inmobiliarias(id) ON DELETE CASCADE,
  subscription_id VARCHAR(36) REFERENCES suscripciones(id) ON DELETE SET NULL,
  amount          NUMERIC,
  currency        VARCHAR(10) DEFAULT 'ARS',
  status          VARCHAR(50) DEFAULT 'aprobado',
  method          VARCHAR(50) DEFAULT 'simulado',   -- 'mercadopago' | 'simulado'
  mp_payment_id   VARCHAR(255),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
-- TABLA: invitaciones
-- Links de invitación para que nuevos usuarios se unan a una agencia.
-- =============================================================================
CREATE TABLE IF NOT EXISTS invitaciones (
  id         VARCHAR(36)  PRIMARY KEY,
  agency_id  VARCHAR(36)  NOT NULL REFERENCES inmobiliarias(id) ON DELETE CASCADE,
  role       VARCHAR(50)  DEFAULT 'agente',   -- 'admin' | 'agente'
  note       TEXT         DEFAULT '',
  token      VARCHAR(100) UNIQUE NOT NULL,
  status     VARCHAR(50)  DEFAULT 'pendiente',  -- 'pendiente' | 'aceptada' | 'cancelada'
  created_at TIMESTAMPTZ  DEFAULT NOW()
);


-- =============================================================================
-- TABLA: tickets_soporte
-- Tickets de soporte que los usuarios envían al administrador de la plataforma.
-- =============================================================================
CREATE TABLE IF NOT EXISTS tickets_soporte (
  id           VARCHAR(36)  PRIMARY KEY,
  agency_id    VARCHAR(36)  NOT NULL REFERENCES inmobiliarias(id) ON DELETE CASCADE,
  user_id      VARCHAR(36)  REFERENCES usuarios(id) ON DELETE SET NULL,
  subject      VARCHAR(500) DEFAULT '',
  message      TEXT         DEFAULT '',
  status       VARCHAR(50)  DEFAULT 'abierto',  -- 'abierto' | 'resuelto'
  admin_note   TEXT         DEFAULT '',
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);


-- =============================================================================
-- ÍNDICES para mejorar velocidad de búsqueda
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_usuarios_email        ON usuarios(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_usuarios_agency_id    ON usuarios(agency_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_user_id      ON sesiones(user_id);
CREATE INDEX IF NOT EXISTS idx_propiedades_agency_id ON propiedades(agency_id);
CREATE INDEX IF NOT EXISTS idx_compartidas_owner     ON compartidas(owner_agency_id);
CREATE INDEX IF NOT EXISTS idx_compartidas_target    ON compartidas(target_agency_id);
CREATE INDEX IF NOT EXISTS idx_sociedades_a          ON sociedades(agency_a_id);
CREATE INDEX IF NOT EXISTS idx_sociedades_b          ON sociedades(agency_b_id);
CREATE INDEX IF NOT EXISTS idx_alertas_agency_id     ON alertas_busqueda(agency_id);
CREATE INDEX IF NOT EXISTS idx_pagos_agency_id       ON pagos(agency_id);


-- =============================================================================
-- DATO INICIAL: fila del plan de suscripción
-- =============================================================================
INSERT INTO plan_suscripcion (id, name, price_ars)
VALUES (1, 'Plan Mensual', 15000)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- Verificación final: muestra las tablas creadas
-- =============================================================================
SELECT tablename AS tabla, pg_size_pretty(pg_total_relation_size(quote_ident(tablename))) AS tamaño
FROM pg_tables
WHERE schemaname = 'current_schema()'
  OR schemaname = 'public'
ORDER BY tablename;
