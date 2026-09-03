-- Schema completo SpiderConect
-- Ejecutar: psql -U postgres -d spiderconnect -f backend/sql/002_full_schema.sql

CREATE TABLE IF NOT EXISTS inmobiliarias (
  id            VARCHAR(36)  PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(255) UNIQUE NOT NULL,
  email         VARCHAR(255) NOT NULL,
  phone         VARCHAR(100) DEFAULT '',
  city          VARCHAR(255) DEFAULT '',
  account_type  VARCHAR(50)  DEFAULT 'inmobiliaria',
  logo_path     VARCHAR(500),
  brand_color   VARCHAR(7)   DEFAULT '#1f6f54',
  api_key       VARCHAR(100),
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sesiones (
  token      VARCHAR(36)  PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS propiedades (
  id          VARCHAR(36)  PRIMARY KEY,
  agency_id   VARCHAR(36)  NOT NULL REFERENCES inmobiliarias(id) ON DELETE CASCADE,
  title       VARCHAR(500) NOT NULL,
  description TEXT         DEFAULT '',
  operation   VARCHAR(50),
  type        VARCHAR(50),
  price       NUMERIC      DEFAULT 0,
  currency    VARCHAR(10)  DEFAULT 'USD',
  address     VARCHAR(500) DEFAULT '',
  city        VARCHAR(255) DEFAULT '',
  province    VARCHAR(255) DEFAULT '',
  bedrooms    INTEGER      DEFAULT 0,
  bathrooms   INTEGER      DEFAULT 0,
  area_m2     NUMERIC      DEFAULT 0,
  status      VARCHAR(50)  DEFAULT 'publicada',
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sociedades (
  id           VARCHAR(36) PRIMARY KEY,
  agency_a_id  VARCHAR(36) NOT NULL,
  agency_b_id  VARCHAR(36) NOT NULL,
  requested_by VARCHAR(36),
  status       VARCHAR(50) DEFAULT 'pendiente',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS compartidas (
  id                    VARCHAR(36) PRIMARY KEY,
  property_id           VARCHAR(36) NOT NULL,
  owner_agency_id       VARCHAR(36) NOT NULL,
  target_agency_id      VARCHAR(36) NOT NULL,
  status                VARCHAR(50) DEFAULT 'pendiente',
  web_publish_authorized BOOLEAN    DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  responded_at          TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS alertas_busqueda (
  id           VARCHAR(36)  PRIMARY KEY,
  agency_id    VARCHAR(36)  NOT NULL,
  title        VARCHAR(255) DEFAULT '',
  operation    VARCHAR(50)  DEFAULT '',
  type         VARCHAR(50)  DEFAULT '',
  city         VARCHAR(255) DEFAULT '',
  currency     VARCHAR(10)  DEFAULT '',
  min_price    NUMERIC,
  max_price    NUMERIC,
  min_bedrooms INTEGER,
  active       BOOLEAN      DEFAULT true,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_suscripcion (
  id        INTEGER PRIMARY KEY DEFAULT 1,
  name      VARCHAR(255) DEFAULT 'Plan Mensual',
  price_ars NUMERIC      DEFAULT 15000
);

CREATE TABLE IF NOT EXISTS suscripciones (
  id                  VARCHAR(36) PRIMARY KEY,
  agency_id           VARCHAR(36) NOT NULL,
  status              VARCHAR(50) DEFAULT 'trial',
  trial_ends_at       TIMESTAMPTZ,
  current_period_end  TIMESTAMPTZ,
  mp_preapproval_id   VARCHAR(255),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pagos (
  id              VARCHAR(36) PRIMARY KEY,
  agency_id       VARCHAR(36) NOT NULL,
  subscription_id VARCHAR(36),
  amount          NUMERIC,
  currency        VARCHAR(10) DEFAULT 'ARS',
  status          VARCHAR(50) DEFAULT 'aprobado',
  method          VARCHAR(50) DEFAULT 'simulado',
  mp_payment_id   VARCHAR(255),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invitaciones (
  id         VARCHAR(36)  PRIMARY KEY,
  agency_id  VARCHAR(36)  NOT NULL,
  role       VARCHAR(50)  DEFAULT 'agente',
  note       TEXT         DEFAULT '',
  token      VARCHAR(100) UNIQUE NOT NULL,
  status     VARCHAR(50)  DEFAULT 'pendiente',
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets_soporte (
  id           VARCHAR(36) PRIMARY KEY,
  agency_id    VARCHAR(36) NOT NULL,
  user_id      VARCHAR(36),
  subject      VARCHAR(500) DEFAULT '',
  message      TEXT         DEFAULT '',
  status       VARCHAR(50)  DEFAULT 'abierto',
  admin_note   TEXT         DEFAULT '',
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- Fila única del plan (insertar si no existe)
INSERT INTO plan_suscripcion (id, name, price_ars)
VALUES (1, 'Plan Mensual', 15000)
ON CONFLICT (id) DO NOTHING;
