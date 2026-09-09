CREATE TABLE IF NOT EXISTS propiedad_media (
  id          VARCHAR(36) PRIMARY KEY,
  property_id VARCHAR(36) NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
  url         VARCHAR(500) NOT NULL,
  type        VARCHAR(20)  NOT NULL,
  filename    VARCHAR(255) DEFAULT '',
  sort_order  INTEGER      DEFAULT 0,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
