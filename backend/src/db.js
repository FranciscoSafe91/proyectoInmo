// db.js — MySQL (mysql2/promise)
import pool from './pgPool.js';
import { randomUUID, randomBytes } from 'node:crypto';

const TRIAL_DAYS = 14;
const BILLING_PERIOD_DAYS = 30;

function uuid() { return randomUUID(); }
function now() { return new Date().toISOString(); }
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
function generateApiKey() { return randomBytes(24).toString('hex'); }

// ---------------------------------------------------------------------------
// Mappers snake_case → camelCase
// ---------------------------------------------------------------------------
function toAgency(r) {
  if (!r) return null;
  return {
    id: r.id, name: r.name, slug: r.slug, email: r.email,
    phone: r.phone, city: r.city, accountType: r.account_type,
    logoPath: r.logo_path, brandColor: r.brand_color, apiKey: r.api_key,
    createdAt: r.created_at,
  };
}

function toUser(r) {
  if (!r) return null;
  return {
    id: r.id, agencyId: r.agency_id,
    name: r.name || `${r.nombre || ''} ${r.apellido || ''}`.trim(),
    nombre: r.nombre, apellido: r.apellido, documento: r.documento,
    email: r.email, username: r.username,
    accountType: r.account_type, agencyName: r.agency_name, direccion: r.direccion,
    passwordHash: r.password_hash, passwordSalt: r.password_salt,
    role: r.role, isPlatformAdmin: Boolean(r.is_platform_admin), createdAt: r.created_at,
  };
}

function toProperty(r) {
  if (!r) return null;
  return {
    id: r.id, agencyId: r.agency_id, createdByUserId: r.created_by_user_id,
    title: r.title, description: r.description,
    operation: r.operation, type: r.type, price: Number(r.price),
    currency: r.currency, address: r.address, city: r.city, province: r.province,
    bedrooms: r.bedrooms, bathrooms: r.bathrooms, areaM2: Number(r.area_m2),
    status: r.status, createdAt: r.created_at, updatedAt: r.updated_at,
    barrioCerrado: Boolean(r.barrio_cerrado),
    zonaGeografica: r.zona_geografica || '',
    partido: r.partido || '',
    localidad: r.localidad || '',
    calle: r.calle || '',
    nroCalle: r.nro_calle || '',
    piso: r.piso || '',
    depto: r.depto || '',
    mostrarPortales: r.mostrar_portales || 'aproximada',
    entreCalles: r.entre_calles || '',
    yCalles: r.y_calles || '',
    cercaDe: r.cerca_de || '',
    latitud: r.latitud ? Number(r.latitud) : null,
    longitud: r.longitud ? Number(r.longitud) : null,
    anchoTerreno: r.ancho_terreno ? Number(r.ancho_terreno) : null,
    largoTerreno: r.largo_terreno ? Number(r.largo_terreno) : null,
    superficieTerreno: r.superficie_terreno ? Number(r.superficie_terreno) : null,
    superficieTotal: r.superficie_total ? Number(r.superficie_total) : null,
    superficieCubierta: r.superficie_cubierta ? Number(r.superficie_cubierta) : null,
    superficieDescubierta: r.superficie_descubierta ? Number(r.superficie_descubierta) : null,
    fondoLibre: r.fondo_libre ? Number(r.fondo_libre) : null,
    estadoPropiedad: r.estado_propiedad || '',
    antiguedad: r.antiguedad != null ? Number(r.antiguedad) : null,
    aEstrenar: Boolean(r.a_estrenar),
    plantas: r.plantas || '',
    orientacion: r.orientacion || '',
    aguaCaliente: r.agua_caliente || '',
    calefaccion: r.calefaccion || '',
    luminosidad: r.luminosidad || '',
    tipoVigilancia: r.tipo_vigilancia || '',
    tipoPiso: r.tipo_piso || '',
    tipoTecho: r.tipo_techo || '',
    tipoCosta: r.tipo_costa || '',
    tipoVista: r.tipo_vista || '',
    tipoPendiente: r.tipo_pendiente || '',
    necesitaReubicacion: Boolean(r.necesita_reubicacion),
  };
}

function toPropertyMedia(r) {
  if (!r) return null;
  return {
    id: r.id,
    propertyId: r.property_id,
    url: r.url,
    type: r.type,
    filename: r.filename,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  };
}

function toPartnership(r) {
  if (!r) return null;
  return {
    id: r.id, agencyAId: r.agency_a_id, agencyBId: r.agency_b_id,
    requestedBy: r.requested_by, status: r.status,
    createdAt: r.created_at, respondedAt: r.responded_at,
  };
}

function toShare(r) {
  if (!r) return null;
  return {
    id: r.id, propertyId: r.property_id,
    ownerAgencyId: r.owner_agency_id, targetAgencyId: r.target_agency_id,
    status: r.status, webPublishAuthorized: Boolean(r.web_publish_authorized),
    percentage: r.percentage != null ? Number(r.percentage) : null,
    rejectionReason: r.rejection_reason || null,
    createdAt: r.created_at, respondedAt: r.responded_at,
  };
}

async function ensureCompartidasColumns() {
  await pool.query("ALTER TABLE compartidas ADD COLUMN rejection_reason TEXT DEFAULT NULL").catch(() => {});
  await pool.query("ALTER TABLE compartidas ADD COLUMN percentage DECIMAL(5,2) DEFAULT NULL").catch(() => {});
}

function toAlert(r) {
  if (!r) return null;
  return {
    id: r.id, agencyId: r.agency_id, title: r.title,
    operation: r.operation, type: r.type, city: r.city, currency: r.currency,
    minPrice: r.min_price, maxPrice: r.max_price, minBedrooms: r.min_bedrooms,
    zonaGeografica: r.zona_geografica || '',
    partido: r.partido || '',
    localidad: r.localidad || '',
    minBathrooms: r.min_bathrooms || null,
    minAreaM2: r.min_area_m2 ? Number(r.min_area_m2) : null,
    active: Boolean(r.active), createdAt: r.created_at,
  };
}

function toPlan(r) {
  if (!r) return null;
  return { name: r.name, priceARS: Number(r.price_ars) };
}

function toSubscription(r) {
  if (!r) return null;
  return {
    id: r.id, agencyId: r.agency_id, status: r.status,
    trialEndsAt: r.trial_ends_at, currentPeriodEnd: r.current_period_end,
    mpPreapprovalId: r.mp_preapproval_id, createdAt: r.created_at,
  };
}

function toPayment(r) {
  if (!r) return null;
  return {
    id: r.id, agencyId: r.agency_id, subscriptionId: r.subscription_id,
    amount: Number(r.amount), currency: r.currency, status: r.status,
    method: r.method, mpPaymentId: r.mp_payment_id, createdAt: r.created_at,
  };
}

function toInvitation(r) {
  if (!r) return null;
  return {
    id: r.id, agencyId: r.agency_id, role: r.role, note: r.note,
    token: r.token, status: r.status, createdAt: r.created_at,
  };
}

function toTicket(r) {
  if (!r) return null;
  return {
    id: r.id, agencyId: r.agency_id, userId: r.user_id,
    subject: r.subject, message: r.message, status: r.status,
    adminNote: r.admin_note, createdAt: r.created_at, respondedAt: r.responded_at,
  };
}

function toSession(r) {
  if (!r) return null;
  return { token: r.token, userId: r.user_id, createdAt: r.created_at };
}

// ---------------------------------------------------------------------------
// Reset (usado por seed.js)
// ---------------------------------------------------------------------------
export async function resetDatabase() {
  await pool.query('SET FOREIGN_KEY_CHECKS=0');
  for (const t of ['sesiones','compartidas','sociedades','alertas_busqueda',
                    'pagos','suscripciones','invitaciones','tickets_soporte',
                    'propiedades','usuarios','inmobiliarias','plan_suscripcion']) {
    await pool.query(`TRUNCATE TABLE ${t}`);
  }
  await pool.query('SET FOREIGN_KEY_CHECKS=1');
  await pool.query("INSERT IGNORE INTO plan_suscripcion (id,name,price_ars) VALUES (1,'Plan Mensual',15000)");
}

// ---------------------------------------------------------------------------
// Agencies
// ---------------------------------------------------------------------------
export async function createAgency({ name, slug, email, phone, city, accountType }) {
  const agencyId = uuid();
  const apiKey = generateApiKey();
  const type = accountType === 'agente_independiente' ? 'agente_independiente' : 'inmobiliaria';
  await pool.query(
    `INSERT INTO inmobiliarias (id,name,slug,email,phone,city,account_type,logo_path,brand_color,api_key,created_at)
     VALUES (?,?,?,?,?,?,?,NULL,'#1f6f54',?,NOW())`,
    [agencyId, name, slug, email, phone || '', city || '', type, apiKey]
  );
  const agency = await getAgency(agencyId);
  await createTrialSubscription(agencyId);
  return agency;
}

export async function getAgency(agencyId) {
  const [rows] = await pool.query('SELECT * FROM inmobiliarias WHERE id=?', [agencyId]);
  return toAgency(rows[0] || null);
}

export async function updateAgency(agencyId, patch) {
  const fields = [];
  const vals = [];
  const map = {
    name: 'name', slug: 'slug', email: 'email', phone: 'phone', city: 'city',
    accountType: 'account_type', logoPath: 'logo_path', brandColor: 'brand_color', apiKey: 'api_key',
  };
  for (const [key, col] of Object.entries(map)) {
    if (patch[key] !== undefined) { fields.push(`${col}=?`); vals.push(patch[key]); }
  }
  if (fields.length === 0) return getAgency(agencyId);
  vals.push(agencyId);
  await pool.query(`UPDATE inmobiliarias SET ${fields.join(',')} WHERE id=?`, vals);
  return getAgency(agencyId);
}

export async function verifyAgencyApiKey(agencyId, apiKey) {
  const agency = await getAgency(agencyId);
  if (!agency || !agency.apiKey || !apiKey) return null;
  const a = Buffer.from(agency.apiKey);
  const b = Buffer.from(String(apiKey));
  if (a.length !== b.length) return null;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0 ? agency : null;
}

export async function regenerateApiKey(agencyId) {
  const newKey = generateApiKey();
  await pool.query('UPDATE inmobiliarias SET api_key=? WHERE id=?', [newKey, agencyId]);
  return getAgency(agencyId);
}

export async function findAgencyByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM inmobiliarias WHERE LOWER(email)=LOWER(?)', [email]);
  return toAgency(rows[0] || null);
}

export async function findAgencyBySlug(slug) {
  const [rows] = await pool.query('SELECT * FROM inmobiliarias WHERE slug=?', [slug]);
  return toAgency(rows[0] || null);
}

export async function listAgencies() {
  const [rows] = await pool.query('SELECT * FROM inmobiliarias ORDER BY created_at');
  return rows.map(toAgency);
}

export async function searchAgencies(query, excludeAgencyId) {
  const q = `%${(query || '').toLowerCase().trim()}%`;
  const [rows] = await pool.query(
    `SELECT * FROM inmobiliarias WHERE id<>? AND (LOWER(name) LIKE ? OR LOWER(city) LIKE ?)`,
    [excludeAgencyId, q, q]
  );
  return rows.map(toAgency);
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export async function createUser({ agencyId, name, nombre, apellido, documento, email, username, accountType, agencyName, direccion, passwordHash, passwordSalt, role, isPlatformAdmin }) {
  const userId = uuid();
  const fullName = name || `${nombre || ''} ${apellido || ''}`.trim();
  await pool.query(
    `INSERT INTO usuarios (id,agency_id,nombre,apellido,documento,email,account_type,agency_name,direccion,username,password_hash,password_salt,role,is_platform_admin,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
    [
      userId, agencyId,
      nombre || fullName, apellido || '',
      documento || '', email,
      accountType || 'inmobiliaria', agencyName || '', direccion || '',
      username || '', passwordHash, passwordSalt,
      role || 'admin', isPlatformAdmin ? 1 : 0,
    ]
  );
  return getUser(userId);
}

export async function findUserByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM usuarios WHERE LOWER(email)=LOWER(?)', [email]);
  return toUser(rows[0] || null);
}

export async function getUser(userId) {
  const [rows] = await pool.query('SELECT * FROM usuarios WHERE id=?', [userId]);
  return toUser(rows[0] || null);
}

export async function listUsersByAgency(agencyId) {
  const [rows] = await pool.query('SELECT * FROM usuarios WHERE agency_id=?', [agencyId]);
  return rows.map(toUser);
}

export async function countAdminsInAgency(agencyId) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) as count FROM usuarios WHERE agency_id=? AND role='admin'", [agencyId]
  );
  return Number(rows[0].count);
}

export async function deleteUser(userId) {
  await pool.query('DELETE FROM sesiones WHERE user_id=?', [userId]);
  await pool.query('DELETE FROM usuarios WHERE id=?', [userId]);
}

export async function updateUserRole(userId, role) {
  const safeRole = role === 'admin' ? 'admin' : 'agente';
  await pool.query('UPDATE usuarios SET role=? WHERE id=?', [safeRole, userId]);
  return getUser(userId);
}

export async function updateUserPassword(userId, passwordHash, passwordSalt) {
  await pool.query('UPDATE usuarios SET password_hash=?,password_salt=? WHERE id=?', [passwordHash, passwordSalt, userId]);
}

// ---------------------------------------------------------------------------
// Password Reset Tokens
// ---------------------------------------------------------------------------
async function ensurePasswordResetTokensTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token      VARCHAR(64)  PRIMARY KEY,
      user_id    VARCHAR(36)  NOT NULL,
      expires_at DATETIME     NOT NULL,
      created_at DATETIME     NOT NULL DEFAULT NOW()
    )
  `);
}

export async function createPasswordResetToken(userId) {
  await ensurePasswordResetTokensTable();
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
  await pool.query('DELETE FROM password_reset_tokens WHERE user_id=?', [userId]);
  await pool.query(
    'INSERT INTO password_reset_tokens (token,user_id,expires_at,created_at) VALUES (?,?,?,NOW())',
    [token, userId, expiresAt]
  );
  return token;
}

export async function getPasswordResetToken(token) {
  await ensurePasswordResetTokensTable();
  const [rows] = await pool.query(
    'SELECT * FROM password_reset_tokens WHERE token=? AND expires_at > NOW()',
    [token]
  );
  if (!rows[0]) return null;
  return { token: rows[0].token, userId: rows[0].user_id, expiresAt: rows[0].expires_at };
}

export async function deletePasswordResetToken(token) {
  await pool.query('DELETE FROM password_reset_tokens WHERE token=?', [token]);
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------
export async function createSession(userId) {
  const token = uuid();
  await pool.query('INSERT INTO sesiones (token,user_id,created_at) VALUES (?,?,NOW())', [token, userId]);
  return token;
}

export async function getSession(token) {
  const [rows] = await pool.query('SELECT * FROM sesiones WHERE token=?', [token]);
  return toSession(rows[0] || null);
}

export async function deleteSession(token) {
  await pool.query('DELETE FROM sesiones WHERE token=?', [token]);
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------
async function ensurePropertyLocationColumns() {
  const cols = [
    "ALTER TABLE propiedades ADD COLUMN barrio_cerrado TINYINT(1) NOT NULL DEFAULT 0",
    "ALTER TABLE propiedades ADD COLUMN zona_geografica VARCHAR(100) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN partido VARCHAR(100) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN calle VARCHAR(200) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN nro_calle VARCHAR(20) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN piso VARCHAR(20) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN depto VARCHAR(20) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN mostrar_portales VARCHAR(30) NOT NULL DEFAULT 'aproximada'",
    "ALTER TABLE propiedades ADD COLUMN entre_calles VARCHAR(200) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN y_calles VARCHAR(200) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN cerca_de VARCHAR(200) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN latitud DECIMAL(10,7) DEFAULT NULL",
    "ALTER TABLE propiedades ADD COLUMN longitud DECIMAL(10,7) DEFAULT NULL",
    "ALTER TABLE propiedades ADD COLUMN localidad VARCHAR(100) NOT NULL DEFAULT ''",
  ];
  for (const sql of cols) {
    await pool.query(sql).catch(() => {});
  }
}

async function ensurePropertyCharacteristicsColumns() {
  const cols = [
    "ALTER TABLE propiedades ADD COLUMN ancho_terreno DECIMAL(10,2) DEFAULT NULL",
    "ALTER TABLE propiedades ADD COLUMN largo_terreno DECIMAL(10,2) DEFAULT NULL",
    "ALTER TABLE propiedades ADD COLUMN superficie_terreno DECIMAL(10,2) DEFAULT NULL",
    "ALTER TABLE propiedades ADD COLUMN superficie_total DECIMAL(10,2) DEFAULT NULL",
    "ALTER TABLE propiedades ADD COLUMN superficie_cubierta DECIMAL(10,2) DEFAULT NULL",
    "ALTER TABLE propiedades ADD COLUMN superficie_descubierta DECIMAL(10,2) DEFAULT NULL",
    "ALTER TABLE propiedades ADD COLUMN fondo_libre DECIMAL(10,2) DEFAULT NULL",
    "ALTER TABLE propiedades ADD COLUMN estado_propiedad VARCHAR(50) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN antiguedad SMALLINT DEFAULT NULL",
    "ALTER TABLE propiedades ADD COLUMN a_estrenar TINYINT(1) NOT NULL DEFAULT 0",
    "ALTER TABLE propiedades ADD COLUMN plantas VARCHAR(20) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN orientacion VARCHAR(30) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN agua_caliente VARCHAR(50) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN calefaccion VARCHAR(50) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN luminosidad VARCHAR(30) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN tipo_vigilancia VARCHAR(50) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN tipo_piso VARCHAR(50) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN tipo_techo VARCHAR(50) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN tipo_costa VARCHAR(50) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN tipo_vista VARCHAR(50) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN tipo_pendiente VARCHAR(50) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN necesita_reubicacion TINYINT(1) NOT NULL DEFAULT 0",
  ];
  for (const sql of cols) {
    await pool.query(sql).catch(() => {});
  }
}

async function ensureAlertasColumns() {
  const cols = [
    "ALTER TABLE alertas_busqueda ADD COLUMN zona_geografica VARCHAR(100) NOT NULL DEFAULT ''",
    "ALTER TABLE alertas_busqueda ADD COLUMN partido VARCHAR(100) NOT NULL DEFAULT ''",
    "ALTER TABLE alertas_busqueda ADD COLUMN localidad VARCHAR(100) NOT NULL DEFAULT ''",
    "ALTER TABLE alertas_busqueda ADD COLUMN min_bathrooms TINYINT DEFAULT NULL",
    "ALTER TABLE alertas_busqueda ADD COLUMN min_area_m2 DECIMAL(10,2) DEFAULT NULL",
  ];
  for (const sql of cols) {
    await pool.query(sql).catch(() => {});
  }
}

async function ensurePropertyMediaTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS propiedad_media (
      id          VARCHAR(36)  PRIMARY KEY,
      property_id VARCHAR(36)  NOT NULL,
      url         VARCHAR(500) NOT NULL,
      type        VARCHAR(20)  NOT NULL,
      filename    VARCHAR(255) DEFAULT '',
      sort_order  INT          DEFAULT 0,
      created_at  DATETIME     DEFAULT NOW()
    )
  `);
}

export async function createProperty(data) {
  await ensurePropertyLocationColumns();
  await ensurePropertyCharacteristicsColumns();
  const propId = uuid();
  const calle = data.calle || '';
  const nroCalle = data.nroCalle || data.nro_calle || '';
  const partido = data.partido || '';
  const zonaGeografica = data.zonaGeografica || data.zona_geografica || '';
  await pool.query(
    `INSERT INTO propiedades
      (id,agency_id,created_by_user_id,title,description,operation,type,price,currency,
       address,city,province,bedrooms,bathrooms,area_m2,status,
       barrio_cerrado,zona_geografica,partido,localidad,calle,nro_calle,piso,depto,
       mostrar_portales,entre_calles,y_calles,cerca_de,latitud,longitud,
       ancho_terreno,largo_terreno,superficie_terreno,superficie_total,
       superficie_cubierta,superficie_descubierta,fondo_libre,
       estado_propiedad,antiguedad,a_estrenar,plantas,orientacion,
       agua_caliente,calefaccion,luminosidad,tipo_vigilancia,
       tipo_piso,tipo_techo,tipo_costa,tipo_vista,tipo_pendiente,necesita_reubicacion,
       created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
    [
      propId, data.agencyId, data.createdByUserId || null, data.title, data.description || '',
      data.operation, data.type, Number(data.price) || 0, data.currency || 'USD',
      `${calle} ${nroCalle}`.trim(), partido, zonaGeografica,
      Number(data.bedrooms) || 0, Number(data.bathrooms) || 0, Number(data.areaM2) || 0,
      data.status || 'publicada',
      data.barrioCerrado === 'true' || data.barrioCerrado === true ? 1 : 0,
      zonaGeografica, partido, data.localidad || '', calle, nroCalle,
      data.piso || '', data.depto || '',
      data.mostrarPortales || data.mostrar_portales || 'aproximada',
      data.entreCalles || data.entre_calles || '',
      data.yCalles || data.y_calles || '',
      data.cercaDe || data.cerca_de || '',
      data.latitud ? Number(data.latitud) : null,
      data.longitud ? Number(data.longitud) : null,
      data.anchoTerreno ? Number(data.anchoTerreno) : null,
      data.largoTerreno ? Number(data.largoTerreno) : null,
      data.superficieTerreno ? Number(data.superficieTerreno) : null,
      data.superficieTotal ? Number(data.superficieTotal) : null,
      data.superficieCubierta ? Number(data.superficieCubierta) : null,
      data.superficieDescubierta ? Number(data.superficieDescubierta) : null,
      data.fondoLibre ? Number(data.fondoLibre) : null,
      data.estadoPropiedad || '',
      data.antiguedad ? Number(data.antiguedad) : null,
      data.aEstrenar === 'true' || data.aEstrenar === true ? 1 : 0,
      data.plantas || '',
      data.orientacion || '',
      data.aguaCaliente || '',
      data.calefaccion || '',
      data.luminosidad || '',
      data.tipoVigilancia || '',
      data.tipoPiso || '',
      data.tipoTecho || '',
      data.tipoCosta || '',
      data.tipoVista || '',
      data.tipoPendiente || '',
      data.necesitaReubicacion === 'true' || data.necesitaReubicacion === true ? 1 : 0,
    ]
  );
  return getProperty(propId);
}

export async function createPropertyMedia({ propertyId, url, type, filename, sortOrder }) {
  await ensurePropertyMediaTable();
  const id = uuid();
  await pool.query(
    `INSERT INTO propiedad_media (id,property_id,url,type,filename,sort_order,created_at)
     VALUES (?,?,?,?,?,?,NOW())`,
    [id, propertyId, url, type, filename || '', Number(sortOrder) || 0]
  );
  const [rows] = await pool.query('SELECT * FROM propiedad_media WHERE id=?', [id]);
  return toPropertyMedia(rows[0]);
}

export async function listPropertyMedia(propertyId) {
  await ensurePropertyMediaTable();
  const [rows] = await pool.query(
    'SELECT * FROM propiedad_media WHERE property_id=? ORDER BY sort_order ASC, created_at ASC',
    [propertyId]
  );
  return rows.map(toPropertyMedia);
}

export async function getProperty(propertyId) {
  const [rows] = await pool.query('SELECT * FROM propiedades WHERE id=?', [propertyId]);
  return toProperty(rows[0] || null);
}

export async function listPropertiesByAgency(agencyId) {
  const [rows] = await pool.query(
    'SELECT * FROM propiedades WHERE agency_id=? ORDER BY created_at DESC', [agencyId]
  );
  return rows.map(toProperty);
}

export async function listPropertiesByUser(agencyId, userId) {
  const [rows] = await pool.query(
    'SELECT * FROM propiedades WHERE agency_id=? AND created_by_user_id=? ORDER BY created_at DESC',
    [agencyId, userId]
  );
  return rows.map(toProperty);
}

export async function deleteProperty(propertyId) {
  await pool.query('DELETE FROM propiedades WHERE id=?', [propertyId]);
}

export async function updateProperty(propertyId, patch) {
  await ensurePropertyLocationColumns();
  await ensurePropertyCharacteristicsColumns();
  const fields = [];
  const vals = [];
  const map = {
    title: 'title', description: 'description', operation: 'operation', type: 'type',
    price: 'price', currency: 'currency', address: 'address', city: 'city',
    province: 'province', bedrooms: 'bedrooms', bathrooms: 'bathrooms',
    areaM2: 'area_m2', status: 'status',
    zonaGeografica: 'zona_geografica', partido: 'partido', localidad: 'localidad',
    calle: 'calle', nroCalle: 'nro_calle', piso: 'piso', depto: 'depto',
    mostrarPortales: 'mostrar_portales',
    entreCalles: 'entre_calles', yCalles: 'y_calles', cercaDe: 'cerca_de',
    latitud: 'latitud', longitud: 'longitud',
    anchoTerreno: 'ancho_terreno', largoTerreno: 'largo_terreno',
    superficieTerreno: 'superficie_terreno', superficieTotal: 'superficie_total',
    superficieCubierta: 'superficie_cubierta', superficieDescubierta: 'superficie_descubierta',
    fondoLibre: 'fondo_libre', estadoPropiedad: 'estado_propiedad',
    antiguedad: 'antiguedad', plantas: 'plantas', orientacion: 'orientacion',
    aguaCaliente: 'agua_caliente', calefaccion: 'calefaccion',
    luminosidad: 'luminosidad', tipoVigilancia: 'tipo_vigilancia',
    tipoPiso: 'tipo_piso', tipoTecho: 'tipo_techo',
    tipoCosta: 'tipo_costa', tipoVista: 'tipo_vista', tipoPendiente: 'tipo_pendiente',
  };
  if (patch.necesitaReubicacion !== undefined) {
    fields.push('necesita_reubicacion=?');
    vals.push(patch.necesitaReubicacion === 'true' || patch.necesitaReubicacion === true ? 1 : 0);
  }
  for (const [key, col] of Object.entries(map)) {
    if (patch[key] !== undefined) { fields.push(`${col}=?`); vals.push(patch[key]); }
  }
  if (patch.barrioCerrado !== undefined) {
    fields.push('barrio_cerrado=?');
    vals.push(patch.barrioCerrado === 'true' || patch.barrioCerrado === true ? 1 : 0);
  }
  if (patch.aEstrenar !== undefined) {
    fields.push('a_estrenar=?');
    vals.push(patch.aEstrenar === 'true' || patch.aEstrenar === true ? 1 : 0);
  }
  // mantener address/city/province sincronizados con los nuevos campos
  if (patch.calle !== undefined || patch.nroCalle !== undefined) {
    const calle = patch.calle ?? '';
    const nro = patch.nroCalle ?? '';
    fields.push('address=?'); vals.push(`${calle} ${nro}`.trim());
  }
  if (patch.partido !== undefined) { fields.push('city=?'); vals.push(patch.partido); }
  if (patch.zonaGeografica !== undefined) { fields.push('province=?'); vals.push(patch.zonaGeografica); }
  fields.push('updated_at=NOW()');
  vals.push(propertyId);
  await pool.query(`UPDATE propiedades SET ${fields.join(',')} WHERE id=?`, vals);
  return getProperty(propertyId);
}

// ---------------------------------------------------------------------------
// Partnerships
// ---------------------------------------------------------------------------
export async function arePartners(agencyAId, agencyBId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM sociedades WHERE status='aceptada'
     AND ((agency_a_id=? AND agency_b_id=?) OR (agency_a_id=? AND agency_b_id=?))`,
    [agencyAId, agencyBId, agencyBId, agencyAId]
  );
  return rows.length > 0;
}

export async function findPartnership(agencyAId, agencyBId) {
  const [rows] = await pool.query(
    `SELECT * FROM sociedades
     WHERE (agency_a_id=? AND agency_b_id=?) OR (agency_a_id=? AND agency_b_id=?)`,
    [agencyAId, agencyBId, agencyBId, agencyAId]
  );
  return toPartnership(rows[0] || null);
}

export async function createPartnershipRequest({ fromAgencyId, toAgencyId }) {
  const id = uuid();
  await pool.query(
    `INSERT INTO sociedades (id,agency_a_id,agency_b_id,requested_by,status,created_at)
     VALUES (?,?,?,?,'pendiente',NOW())`,
    [id, fromAgencyId, toAgencyId, fromAgencyId]
  );
  return getPartnership(id);
}

export async function getPartnership(partnershipId) {
  const [rows] = await pool.query('SELECT * FROM sociedades WHERE id=?', [partnershipId]);
  return toPartnership(rows[0] || null);
}

export async function respondPartnership(partnershipId, status) {
  await pool.query(
    'UPDATE sociedades SET status=?, responded_at=NOW() WHERE id=?',
    [status, partnershipId]
  );
  return getPartnership(partnershipId);
}

export async function listPartnersOfAgency(agencyId) {
  const [rows] = await pool.query(
    `SELECT agency_a_id, agency_b_id FROM sociedades
     WHERE status='aceptada' AND (agency_a_id=? OR agency_b_id=?)`,
    [agencyId, agencyId]
  );
  return rows.map(r => r.agency_a_id === agencyId ? r.agency_b_id : r.agency_a_id);
}

export async function listPendingPartnershipRequestsReceived(agencyId) {
  const [rows] = await pool.query(
    "SELECT * FROM sociedades WHERE status='pendiente' AND agency_b_id=?", [agencyId]
  );
  return rows.map(toPartnership);
}

export async function listPendingPartnershipRequestsSent(agencyId) {
  const [rows] = await pool.query(
    "SELECT * FROM sociedades WHERE status='pendiente' AND agency_a_id=?", [agencyId]
  );
  return rows.map(toPartnership);
}

// ---------------------------------------------------------------------------
// Property shares
// ---------------------------------------------------------------------------
export async function createPropertyShare({ propertyId, ownerAgencyId, targetAgencyId, percentage }) {
  await ensureCompartidasColumns();
  const [existing] = await pool.query(
    `SELECT * FROM compartidas WHERE property_id=? AND target_agency_id=? AND status<>'rechazada'`,
    [propertyId, targetAgencyId]
  );
  if (existing.length > 0) return toShare(existing[0]);
  const id = uuid();
  const pct = (percentage !== undefined && percentage !== null && percentage !== '') ? Number(percentage) : null;
  await pool.query(
    `INSERT INTO compartidas (id,property_id,owner_agency_id,target_agency_id,status,web_publish_authorized,percentage,created_at)
     VALUES (?,?,?,?,'pendiente',0,?,NOW())`,
    [id, propertyId, ownerAgencyId, targetAgencyId, pct]
  );
  return getPropertyShare(id);
}

export async function getPropertyShare(shareId) {
  const [rows] = await pool.query('SELECT * FROM compartidas WHERE id=?', [shareId]);
  return toShare(rows[0] || null);
}

export async function getShareForPropertyAndTarget(propertyId, targetAgencyId) {
  const [rows] = await pool.query(
    'SELECT * FROM compartidas WHERE property_id=? AND target_agency_id=?', [propertyId, targetAgencyId]
  );
  return toShare(rows[0] || null);
}

export async function setSharePublishAuthorization(shareId, authorized) {
  await pool.query('UPDATE compartidas SET web_publish_authorized=? WHERE id=?', [authorized ? 1 : 0, shareId]);
  return getPropertyShare(shareId);
}

export async function cancelShare(shareId) {
  await pool.query('DELETE FROM compartidas WHERE id=?', [shareId]);
}

export async function respondPropertyShare(shareId, status, rejectionReason) {
  await ensureCompartidasColumns();
  if (status === 'rechazada' && rejectionReason) {
    await pool.query('UPDATE compartidas SET status=?, rejection_reason=?, responded_at=NOW() WHERE id=?', [status, rejectionReason, shareId]);
  } else {
    await pool.query('UPDATE compartidas SET status=?, responded_at=NOW() WHERE id=?', [status, shareId]);
  }
  return getPropertyShare(shareId);
}

export async function listSharesForProperty(propertyId) {
  const [rows] = await pool.query('SELECT * FROM compartidas WHERE property_id=?', [propertyId]);
  return rows.map(toShare);
}

export async function listPendingSharesReceived(agencyId) {
  const [rows] = await pool.query(
    "SELECT * FROM compartidas WHERE status='pendiente' AND target_agency_id=?", [agencyId]
  );
  return rows.map(toShare);
}

export async function listAcceptedSharesReceived(agencyId) {
  const [rows] = await pool.query(
    "SELECT * FROM compartidas WHERE status='aceptada' AND target_agency_id=?", [agencyId]
  );
  return rows.map(toShare);
}

export async function listSharesByOwnerAgency(agencyId) {
  const [rows] = await pool.query('SELECT * FROM compartidas WHERE owner_agency_id=?', [agencyId]);
  return rows.map(toShare);
}

// ---------------------------------------------------------------------------
// Alertas de búsqueda
// ---------------------------------------------------------------------------
export async function createSearchAlert(data) {
  await ensureAlertasColumns();
  const id = uuid();
  await pool.query(
    `INSERT INTO alertas_busqueda
      (id,agency_id,title,operation,type,city,currency,min_price,max_price,min_bedrooms,
       zona_geografica,partido,localidad,min_bathrooms,min_area_m2,active,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,NOW())`,
    [
      id, data.agencyId, data.title || '', data.operation || '', data.type || '',
      (data.city || '').trim(), data.currency || '',
      data.minPrice ? Number(data.minPrice) : null,
      data.maxPrice ? Number(data.maxPrice) : null,
      data.minBedrooms ? Number(data.minBedrooms) : null,
      data.zonaGeografica || '',
      data.partido || '',
      data.localidad || '',
      data.minBathrooms ? Number(data.minBathrooms) : null,
      data.minAreaM2 ? Number(data.minAreaM2) : null,
    ]
  );
  return getSearchAlert(id);
}

export async function getSearchAlert(alertId) {
  const [rows] = await pool.query('SELECT * FROM alertas_busqueda WHERE id=?', [alertId]);
  return toAlert(rows[0] || null);
}

export async function listAlertsByAgency(agencyId) {
  await ensureAlertasColumns();
  const [rows] = await pool.query(
    'SELECT * FROM alertas_busqueda WHERE agency_id=? ORDER BY created_at DESC', [agencyId]
  );
  return rows.map(toAlert);
}

export async function setSearchAlertActive(alertId, active) {
  await pool.query('UPDATE alertas_busqueda SET active=? WHERE id=?', [active ? 1 : 0, alertId]);
  return getSearchAlert(alertId);
}

export async function deleteSearchAlert(alertId) {
  await pool.query('DELETE FROM alertas_busqueda WHERE id=?', [alertId]);
}

function propertyMatchesAlert(property, alert) {
  if (property.status !== 'publicada') return false;
  if (alert.operation && property.operation !== alert.operation) return false;
  if (alert.type && property.type !== alert.type) return false;
  // location: use new structured fields if set, otherwise fall back to legacy city text
  if (alert.zonaGeografica) {
    if (property.zonaGeografica !== alert.zonaGeografica) return false;
  } else if (alert.city) {
    const haystack = [property.city, property.localidad, property.partido, property.zonaGeografica].join(' ').toLowerCase();
    if (!haystack.includes(alert.city.toLowerCase())) return false;
  }
  if (alert.partido && property.partido !== alert.partido) return false;
  if (alert.localidad && property.localidad !== alert.localidad) return false;
  if (alert.currency) {
    if (property.currency !== alert.currency) return false;
    if (alert.minPrice && property.price < alert.minPrice) return false;
    if (alert.maxPrice && property.price > alert.maxPrice) return false;
  }
  if (alert.minBedrooms && property.bedrooms < alert.minBedrooms) return false;
  if (alert.minBathrooms && property.bathrooms < alert.minBathrooms) return false;
  if (alert.minAreaM2 && property.areaM2 < alert.minAreaM2) return false;
  return true;
}

export async function listAlertMatchesForOwner(ownerAgencyId) {
  const myProperties = (await listPropertiesByAgency(ownerAgencyId)).filter(p => p.status === 'publicada');
  if (myProperties.length === 0) return [];

  const partnerIds = await listPartnersOfAgency(ownerAgencyId);
  if (partnerIds.length === 0) return [];

  const placeholders = partnerIds.map(() => '?').join(',');
  const [alertRows] = await pool.query(
    `SELECT * FROM alertas_busqueda WHERE active=1 AND agency_id IN (${placeholders})`, partnerIds
  );
  const partnerAlerts = alertRows.map(toAlert);
  if (partnerAlerts.length === 0) return [];

  const [shareRows] = await pool.query(
    `SELECT * FROM compartidas WHERE owner_agency_id=? AND status<>'rechazada'`, [ownerAgencyId]
  );
  const existingShares = shareRows.map(toShare);

  const matches = [];
  for (const partnerAgencyId of partnerIds) {
    const alerts = partnerAlerts.filter(a => a.agencyId === partnerAgencyId);
    for (const property of myProperties) {
      const alreadyShared = existingShares.some(
        s => s.propertyId === property.id && s.targetAgencyId === partnerAgencyId
      );
      if (alreadyShared) continue;
      for (const alert of alerts) {
        if (propertyMatchesAlert(property, alert)) {
          matches.push({ alert, property, requestingAgencyId: partnerAgencyId });
        }
      }
    }
  }
  return matches;
}

export async function findMatchingAlertsForProperty(property, ownerAgencyId) {
  if (property.status !== 'publicada') return [];
  const partnerIds = await listPartnersOfAgency(ownerAgencyId);
  if (partnerIds.length === 0) return [];

  const placeholders = partnerIds.map(() => '?').join(',');
  const [alertRows] = await pool.query(
    `SELECT * FROM alertas_busqueda WHERE active=1 AND agency_id IN (${placeholders})`, partnerIds
  );
  const partnerAlerts = alertRows.map(toAlert);
  if (partnerAlerts.length === 0) return [];

  const [shareRows] = await pool.query(
    `SELECT * FROM compartidas WHERE owner_agency_id=? AND property_id=? AND status<>'rechazada'`,
    [ownerAgencyId, property.id]
  );
  const existingShares = shareRows.map(toShare);

  const matches = [];
  for (const alert of partnerAlerts) {
    const alreadyShared = existingShares.some(s => s.targetAgencyId === alert.agencyId);
    if (alreadyShared) continue;
    if (propertyMatchesAlert(property, alert)) {
      matches.push({ alert, requestingAgencyId: alert.agencyId });
    }
  }
  return matches;
}

// ---------------------------------------------------------------------------
// Feed público
// ---------------------------------------------------------------------------
export async function listFeedPropertiesForAgency(agencyId) {
  const own = (await listPropertiesByAgency(agencyId))
    .filter(p => p.status === 'publicada')
    .map(p => ({ property: p, source: 'propia', ownerAgencyId: agencyId }));

  const shares = await listAcceptedSharesReceived(agencyId);
  const sharedItems = (await Promise.all(
    shares
      .filter(s => s.webPublishAuthorized)
      .map(async s => {
        const property = await getProperty(s.propertyId);
        if (!property || property.status !== 'publicada') return null;
        return { property, source: 'compartida', ownerAgencyId: s.ownerAgencyId };
      })
  )).filter(Boolean);

  return [...own, ...sharedItems];
}

// ---------------------------------------------------------------------------
// Plan y suscripciones
// ---------------------------------------------------------------------------
export async function getPlan() {
  const [rows] = await pool.query('SELECT * FROM plan_suscripcion WHERE id=1');
  return toPlan(rows[0] || { name: 'Plan Mensual', price_ars: 15000 });
}

export async function updatePlan(patch) {
  await pool.query(
    `UPDATE plan_suscripcion SET name=COALESCE(?,name), price_ars=COALESCE(?,price_ars) WHERE id=1`,
    [patch.name || null, patch.priceARS != null ? Number(patch.priceARS) : null]
  );
  return getPlan();
}

export async function createTrialSubscription(agencyId) {
  const trialEndsAt = addDays(now(), TRIAL_DAYS);
  const id = uuid();
  await pool.query(
    `INSERT INTO suscripciones (id,agency_id,status,trial_ends_at,created_at)
     VALUES (?,?,'trial',?,NOW())`,
    [id, agencyId, trialEndsAt]
  );
  return getSubscriptionByAgency(agencyId);
}

export async function getSubscriptionByAgency(agencyId) {
  const [rows] = await pool.query('SELECT * FROM suscripciones WHERE agency_id=?', [agencyId]);
  return toSubscription(rows[0] || null);
}

export async function updateSubscription(agencyId, patch) {
  const fields = [];
  const vals = [];
  if (patch.status !== undefined)           { fields.push('status=?');             vals.push(patch.status); }
  if (patch.trialEndsAt !== undefined)      { fields.push('trial_ends_at=?');      vals.push(patch.trialEndsAt); }
  if (patch.currentPeriodEnd !== undefined) { fields.push('current_period_end=?'); vals.push(patch.currentPeriodEnd); }
  if (patch.mpPreapprovalId !== undefined)  { fields.push('mp_preapproval_id=?');  vals.push(patch.mpPreapprovalId); }
  if (fields.length === 0) return getSubscriptionByAgency(agencyId);
  vals.push(agencyId);
  await pool.query(`UPDATE suscripciones SET ${fields.join(',')} WHERE agency_id=?`, vals);
  return getSubscriptionByAgency(agencyId);
}

export function effectiveSubscriptionStatus(subscription) {
  if (!subscription) return 'sin_suscripcion';
  if (subscription.status === 'cancelada') return 'cancelada';
  const nowD = new Date();
  if (subscription.status === 'trial') {
    return new Date(subscription.trialEndsAt) > nowD ? 'trial' : 'vencida';
  }
  if (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < nowD) return 'vencida';
  return 'activa';
}

export async function applySuccessfulPayment(agencyId, { amount, currency, method, mpPaymentId }) {
  const subscription = await getSubscriptionByAgency(agencyId);
  if (!subscription) return null;

  const base =
    subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) > new Date()
      ? subscription.currentPeriodEnd
      : now();

  await updateSubscription(agencyId, {
    status: 'activa',
    currentPeriodEnd: addDays(base, BILLING_PERIOD_DAYS),
  });

  return createPayment({ agencyId, subscriptionId: subscription.id, amount, currency, status: 'aprobado', method, mpPaymentId });
}

export async function createPayment({ agencyId, subscriptionId, amount, currency, status, method, mpPaymentId }) {
  const id = uuid();
  await pool.query(
    `INSERT INTO pagos (id,agency_id,subscription_id,amount,currency,status,method,mp_payment_id,created_at)
     VALUES (?,?,?,?,?,?,?,?,NOW())`,
    [id, agencyId, subscriptionId || null, amount, currency || 'ARS', status || 'aprobado', method || 'simulado', mpPaymentId || null]
  );
  const [rows] = await pool.query('SELECT * FROM pagos WHERE id=?', [id]);
  return toPayment(rows[0]);
}

export async function listPaymentsByAgency(agencyId) {
  const [rows] = await pool.query(
    'SELECT * FROM pagos WHERE agency_id=? ORDER BY created_at DESC', [agencyId]
  );
  return rows.map(toPayment);
}

export async function listAgenciesWithSubscriptions() {
  const agencies = await listAgencies();
  return Promise.all(agencies.map(async agency => ({
    agency,
    subscription: await getSubscriptionByAgency(agency.id),
  })));
}

// ---------------------------------------------------------------------------
// Invitaciones
// ---------------------------------------------------------------------------
export async function createInvitation({ agencyId, role, note }) {
  const token = randomBytes(16).toString('hex');
  const id = uuid();
  await pool.query(
    `INSERT INTO invitaciones (id,agency_id,role,note,token,status,created_at)
     VALUES (?,?,?,?,?,'pendiente',NOW())`,
    [id, agencyId, role === 'admin' ? 'admin' : 'agente', note || '', token]
  );
  return getInvitation(id);
}

export async function getInvitationByToken(token) {
  const [rows] = await pool.query('SELECT * FROM invitaciones WHERE token=?', [token]);
  return toInvitation(rows[0] || null);
}

export async function getInvitation(invitationId) {
  const [rows] = await pool.query('SELECT * FROM invitaciones WHERE id=?', [invitationId]);
  return toInvitation(rows[0] || null);
}

export async function listPendingInvitationsByAgency(agencyId) {
  const [rows] = await pool.query(
    "SELECT * FROM invitaciones WHERE agency_id=? AND status='pendiente'", [agencyId]
  );
  return rows.map(toInvitation);
}

export async function cancelInvitation(invitationId) {
  await pool.query("UPDATE invitaciones SET status='cancelada' WHERE id=?", [invitationId]);
  return getInvitation(invitationId);
}

export async function acceptInvitation(invitationId) {
  await pool.query("UPDATE invitaciones SET status='aceptada' WHERE id=?", [invitationId]);
  return getInvitation(invitationId);
}

// ---------------------------------------------------------------------------
// Soporte
// ---------------------------------------------------------------------------
export async function createSupportTicket({ agencyId, userId, subject, message }) {
  const id = uuid();
  await pool.query(
    `INSERT INTO tickets_soporte (id,agency_id,user_id,subject,message,status,admin_note,created_at)
     VALUES (?,?,?,?,?,'abierto','',NOW())`,
    [id, agencyId, userId || null, subject || '', message || '']
  );
  return getSupportTicket(id);
}

export async function getSupportTicket(ticketId) {
  const [rows] = await pool.query('SELECT * FROM tickets_soporte WHERE id=?', [ticketId]);
  return toTicket(rows[0] || null);
}

export async function listSupportTicketsByAgency(agencyId) {
  const [rows] = await pool.query(
    'SELECT * FROM tickets_soporte WHERE agency_id=? ORDER BY created_at ASC', [agencyId]
  );
  return rows.map(toTicket);
}

export async function listAllSupportTickets() {
  const [rows] = await pool.query(
    `SELECT * FROM tickets_soporte ORDER BY
     CASE WHEN status='abierto' THEN 0 ELSE 1 END, created_at ASC`
  );
  return rows.map(toTicket);
}

export async function countOpenSupportTickets() {
  const [rows] = await pool.query("SELECT COUNT(*) as count FROM tickets_soporte WHERE status='abierto'");
  return Number(rows[0].count);
}

export async function resolveSupportTicket(ticketId, adminNote) {
  await pool.query(
    `UPDATE tickets_soporte SET status='resuelto', admin_note=?, responded_at=NOW() WHERE id=?`,
    [adminNote || '', ticketId]
  );
  return getSupportTicket(ticketId);
}

export async function reopenSupportTicket(ticketId) {
  await pool.query(
    `UPDATE tickets_soporte SET status='abierto', responded_at=NULL WHERE id=?`, [ticketId]
  );
  return getSupportTicket(ticketId);
}
