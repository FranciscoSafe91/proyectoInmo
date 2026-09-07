-- Schema MySQL — SpiderConect
-- Ejecutar una sola vez para crear todas las tablas.
-- Compatible con MySQL 8.0+

CREATE TABLE IF NOT EXISTS inmobiliarias (
  id           VARCHAR(36)  PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  slug         VARCHAR(255) NOT NULL UNIQUE,
  email        VARCHAR(255) NOT NULL,
  phone        VARCHAR(100) NOT NULL DEFAULT '',
  city         VARCHAR(255) NOT NULL DEFAULT '',
  account_type VARCHAR(50)  NOT NULL DEFAULT 'inmobiliaria',
  logo_path    VARCHAR(500),
  brand_color  VARCHAR(7)   NOT NULL DEFAULT '#1f6f54',
  api_key      VARCHAR(100),
  created_at   DATETIME     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id                VARCHAR(36)  PRIMARY KEY,
  agency_id         VARCHAR(36),
  nombre            VARCHAR(255) NOT NULL,
  apellido          VARCHAR(255) NOT NULL DEFAULT '',
  documento         VARCHAR(100) NOT NULL DEFAULT '',
  email             VARCHAR(255) NOT NULL UNIQUE,
  account_type      VARCHAR(50)  NOT NULL DEFAULT 'inmobiliaria',
  agency_name       VARCHAR(255) NOT NULL DEFAULT '',
  direccion         VARCHAR(500) NOT NULL DEFAULT '',
  username          VARCHAR(100) NOT NULL DEFAULT '',
  password_hash     TEXT         NOT NULL,
  password_salt     VARCHAR(100) NOT NULL,
  role              VARCHAR(50)  NOT NULL DEFAULT 'admin',
  is_platform_admin TINYINT(1)   NOT NULL DEFAULT 0,
  created_at        DATETIME     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sesiones (
  token      VARCHAR(36)  PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS propiedades (
  id                  VARCHAR(36)  PRIMARY KEY,
  agency_id           VARCHAR(36)  NOT NULL,
  created_by_user_id  VARCHAR(36),
  title               VARCHAR(500) NOT NULL,
  description         TEXT         NOT NULL DEFAULT '',
  operation           VARCHAR(50),
  type                VARCHAR(50),
  price               DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency            VARCHAR(10)  NOT NULL DEFAULT 'USD',
  address             VARCHAR(500) NOT NULL DEFAULT '',
  city                VARCHAR(255) NOT NULL DEFAULT '',
  province            VARCHAR(255) NOT NULL DEFAULT '',
  bedrooms            INT          NOT NULL DEFAULT 0,
  bathrooms           INT          NOT NULL DEFAULT 0,
  area_m2             DECIMAL(15,2) NOT NULL DEFAULT 0,
  status              VARCHAR(50)  NOT NULL DEFAULT 'publicada',
  created_at          DATETIME     NOT NULL DEFAULT NOW(),
  updated_at          DATETIME     NOT NULL DEFAULT NOW(),
  FOREIGN KEY (agency_id) REFERENCES inmobiliarias(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sociedades (
  id           VARCHAR(36) PRIMARY KEY,
  agency_a_id  VARCHAR(36) NOT NULL,
  agency_b_id  VARCHAR(36) NOT NULL,
  requested_by VARCHAR(36),
  status       VARCHAR(50) NOT NULL DEFAULT 'pendiente',
  created_at   DATETIME    NOT NULL DEFAULT NOW(),
  responded_at DATETIME
);

CREATE TABLE IF NOT EXISTS compartidas (
  id                     VARCHAR(36) PRIMARY KEY,
  property_id            VARCHAR(36) NOT NULL,
  owner_agency_id        VARCHAR(36) NOT NULL,
  target_agency_id       VARCHAR(36) NOT NULL,
  status                 VARCHAR(50) NOT NULL DEFAULT 'pendiente',
  web_publish_authorized TINYINT(1)  NOT NULL DEFAULT 0,
  created_at             DATETIME    NOT NULL DEFAULT NOW(),
  responded_at           DATETIME
);

CREATE TABLE IF NOT EXISTS alertas_busqueda (
  id           VARCHAR(36)   PRIMARY KEY,
  agency_id    VARCHAR(36)   NOT NULL,
  title        VARCHAR(255)  NOT NULL DEFAULT '',
  operation    VARCHAR(50)   NOT NULL DEFAULT '',
  type         VARCHAR(50)   NOT NULL DEFAULT '',
  city         VARCHAR(255)  NOT NULL DEFAULT '',
  currency     VARCHAR(10)   NOT NULL DEFAULT '',
  min_price    DECIMAL(15,2),
  max_price    DECIMAL(15,2),
  min_bedrooms INT,
  active       TINYINT(1)    NOT NULL DEFAULT 1,
  created_at   DATETIME      NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_suscripcion (
  id        INT          PRIMARY KEY DEFAULT 1,
  name      VARCHAR(255) NOT NULL DEFAULT 'Plan Mensual',
  price_ars DECIMAL(15,2) NOT NULL DEFAULT 15000
);

CREATE TABLE IF NOT EXISTS suscripciones (
  id                 VARCHAR(36)  PRIMARY KEY,
  agency_id          VARCHAR(36)  NOT NULL,
  status             VARCHAR(50)  NOT NULL DEFAULT 'trial',
  trial_ends_at      DATETIME,
  current_period_end DATETIME,
  mp_preapproval_id  VARCHAR(255),
  created_at         DATETIME     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pagos (
  id              VARCHAR(36)   PRIMARY KEY,
  agency_id       VARCHAR(36)   NOT NULL,
  subscription_id VARCHAR(36),
  amount          DECIMAL(15,2),
  currency        VARCHAR(10)   NOT NULL DEFAULT 'ARS',
  status          VARCHAR(50)   NOT NULL DEFAULT 'aprobado',
  method          VARCHAR(50)   NOT NULL DEFAULT 'simulado',
  mp_payment_id   VARCHAR(255),
  created_at      DATETIME      NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invitaciones (
  id         VARCHAR(36)  PRIMARY KEY,
  agency_id  VARCHAR(36)  NOT NULL,
  role       VARCHAR(50)  NOT NULL DEFAULT 'agente',
  note       TEXT         NOT NULL DEFAULT '',
  token      VARCHAR(100) NOT NULL UNIQUE,
  status     VARCHAR(50)  NOT NULL DEFAULT 'pendiente',
  created_at DATETIME     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets_soporte (
  id           VARCHAR(36)  PRIMARY KEY,
  agency_id    VARCHAR(36)  NOT NULL,
  user_id      VARCHAR(36),
  subject      VARCHAR(500) NOT NULL DEFAULT '',
  message      TEXT         NOT NULL DEFAULT '',
  status       VARCHAR(50)  NOT NULL DEFAULT 'abierto',
  admin_note   TEXT         NOT NULL DEFAULT '',
  created_at   DATETIME     NOT NULL DEFAULT NOW(),
  responded_at DATETIME
);

-- Fila única del plan
INSERT IGNORE INTO plan_suscripcion (id, name, price_ars) VALUES (1, 'Plan Mensual', 15000);
