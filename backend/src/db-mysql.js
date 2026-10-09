// db.js — MySQL (mysql2/promise)
import pool from './pgPool.js';
import { randomUUID, randomBytes } from 'node:crypto';

const TRIAL_DAYS = 14;
const BILLING_PERIOD_DAYS = 30;

function uuid() { return randomUUID(); }
function toMySQLDate(d) { return d.toISOString().replace('T', ' ').slice(0, 19); }
function now() { return toMySQLDate(new Date()); }
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return toMySQLDate(d);
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
  let menuPermisos = null;
  if (r.menu_permisos) { try { menuPermisos = JSON.parse(r.menu_permisos); } catch {} }
  return {
    id: r.id, agencyId: r.agency_id,
    name: r.name || `${r.nombre || ''} ${r.apellido || ''}`.trim(),
    nombre: r.nombre, apellido: r.apellido, documento: r.documento,
    email: r.email, username: r.username,
    accountType: r.account_type, agencyName: r.agency_name, direccion: r.direccion,
    passwordHash: r.password_hash, passwordSalt: r.password_salt,
    role: r.role, isPlatformAdmin: Boolean(r.is_platform_admin), createdAt: r.created_at,
    menuPermisos,
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
    nombreBarrioCerrado: r.nombre_barrio_cerrado || '',
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
    superficieSemicubierta: r.superficie_semicubierta ? Number(r.superficie_semicubierta) : null,
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
    zonificacion: r.zonificacion || '',
    necesitaReubicacion: Boolean(r.necesita_reubicacion),
    cocherasCubiertas: r.cocheras_cubiertas != null ? Number(r.cocheras_cubiertas) : null,
    cocherasDescubiertas: r.cocheras_descubiertas != null ? Number(r.cocheras_descubiertas) : null,
    cocherasSemicubiertas: r.cocheras_semicubiertas != null ? Number(r.cocheras_semicubiertas) : null,
    servicios: r.servicios ? tryParseJson(r.servicios) : [],
    instalaciones: r.instalaciones ? tryParseJson(r.instalaciones) : [],
    serviciosEdificio: r.servicios_edificio ? tryParseJson(r.servicios_edificio) : [],
    amenitiesEdificio: r.amenities_edificio ? tryParseJson(r.amenities_edificio) : [],
    aptoCredito: Boolean(r.apto_credito),
    aptoProf: Boolean(r.apto_profesional),
    disposicion: r.disposicion || '',
    categoriaEdificio: r.categoria_edificio || '',
    pisosEdificio: r.pisos_edificio != null ? Number(r.pisos_edificio) : null,
    deptosPorPiso: r.deptos_por_piso != null ? Number(r.deptos_por_piso) : null,
    ascensoresPrincipales: r.ascensores_principales != null ? Number(r.ascensores_principales) : null,
    expensas: r.expensas != null ? Number(r.expensas) : null,
    expensasMoneda: r.expensas_moneda || 'ARS',
    youtubeUrl: r.youtube_url || '',
  };
}

function tryParseJson(val) {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

function toJsonField(val) {
  if (!val) return null;
  if (Array.isArray(val)) return val.length ? JSON.stringify(val) : null;
  if (typeof val === 'string' && val.startsWith('[')) return val || null;
  return null;
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
    percentageVendedor: r.percentage_vendedor != null ? Number(r.percentage_vendedor) : null,
    percentageComprador: r.percentage_comprador != null ? Number(r.percentage_comprador) : null,
    wholeBolsa: Boolean(r.toda_bolsa),
    shareComment: r.share_comment || null,
    rejectionReason: r.rejection_reason || null,
    source: r.source || 'directa',
    createdAt: r.created_at, respondedAt: r.responded_at,
  };
}

async function ensureCompartidasColumns() {
  await pool.query("ALTER TABLE compartidas ADD COLUMN rejection_reason TEXT DEFAULT NULL").catch(() => {});
  await pool.query("ALTER TABLE compartidas ADD COLUMN percentage DECIMAL(5,2) DEFAULT NULL").catch(() => {});
  await pool.query("ALTER TABLE compartidas ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'directa'").catch(() => {});
  await pool.query("ALTER TABLE compartidas ADD COLUMN percentage_vendedor DECIMAL(5,2) DEFAULT NULL").catch(() => {});
  await pool.query("ALTER TABLE compartidas ADD COLUMN percentage_comprador DECIMAL(5,2) DEFAULT NULL").catch(() => {});
  await pool.query("ALTER TABLE compartidas ADD COLUMN toda_bolsa TINYINT(1) NOT NULL DEFAULT 0").catch(() => {});
  await pool.query("ALTER TABLE compartidas ADD COLUMN share_comment TEXT DEFAULT NULL").catch(() => {});
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
    minCocheras: r.min_cocheras != null ? Number(r.min_cocheras) : null,
    serviciosRequeridos: r.servicios_requeridos ? tryParseJson(r.servicios_requeridos) : [],
    instalacionesRequeridas: r.instalaciones_requeridas ? tryParseJson(r.instalaciones_requeridas) : [],
    mudanzaInmediata: Boolean(r.mudanza_inmediata),
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
  let menuPermisos = null;
  if (r.menu_permisos) { try { menuPermisos = JSON.parse(r.menu_permisos); } catch {} }
  return {
    id: r.id, agencyId: r.agency_id, role: r.role, note: r.note,
    token: r.token, status: r.status, createdAt: r.created_at, menuPermisos,
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

function toMatchRequest(r) {
  if (!r) return null;
  return {
    id: r.id,
    alertId: r.alert_id,
    alertAgencyId: r.alert_agency_id,
    propertyId: r.property_id,
    ownerAgencyId: r.owner_agency_id,
    status: r.status,
    alerteeStatus: r.alertee_status || null,
    createdAt: r.created_at,
    respondedAt: r.responded_at,
  };
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
  await ensureUsuariosColumns();
  const [rows] = await pool.query('SELECT * FROM usuarios WHERE id=?', [userId]);
  return toUser(rows[0] || null);
}

export async function listUsersByAgency(agencyId) {
  await ensureUsuariosColumns();
  const [rows] = await pool.query('SELECT * FROM usuarios WHERE agency_id=? ORDER BY created_at', [agencyId]);
  return rows.map(toUser);
}

export async function updateUserMenuPermisos(userId, permisos) {
  const val = permisos === null ? null : JSON.stringify(permisos);
  await pool.query('UPDATE usuarios SET menu_permisos=? WHERE id=?', [val, userId]);
  return getUser(userId);
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
    "ALTER TABLE propiedades ADD COLUMN nombre_barrio_cerrado VARCHAR(200) NOT NULL DEFAULT ''",
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
    await pool.query(sql).catch(e => { if (e.errno !== 1060) console.warn('ensurePropertyLocationColumns:', e.message); });
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
    "ALTER TABLE propiedades ADD COLUMN superficie_semicubierta DECIMAL(10,2) DEFAULT NULL",
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
    "ALTER TABLE propiedades ADD COLUMN zonificacion VARCHAR(100) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN necesita_reubicacion TINYINT(1) NOT NULL DEFAULT 0",
    "ALTER TABLE propiedades ADD COLUMN cocheras_cubiertas TINYINT DEFAULT NULL",
    "ALTER TABLE propiedades ADD COLUMN cocheras_descubiertas TINYINT DEFAULT NULL",
    "ALTER TABLE propiedades ADD COLUMN youtube_url VARCHAR(500) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN cocheras_semicubiertas TINYINT DEFAULT NULL",
    "ALTER TABLE propiedades ADD COLUMN servicios TEXT DEFAULT NULL",
    "ALTER TABLE propiedades ADD COLUMN instalaciones TEXT DEFAULT NULL",
    "ALTER TABLE propiedades ADD COLUMN servicios_edificio TEXT DEFAULT NULL",
    "ALTER TABLE propiedades ADD COLUMN amenities_edificio TEXT DEFAULT NULL",
    "ALTER TABLE propiedades ADD COLUMN apto_credito TINYINT(1) NOT NULL DEFAULT 0",
    "ALTER TABLE propiedades ADD COLUMN apto_profesional TINYINT(1) NOT NULL DEFAULT 0",
    "ALTER TABLE propiedades ADD COLUMN disposicion VARCHAR(50) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN categoria_edificio VARCHAR(50) NOT NULL DEFAULT ''",
    "ALTER TABLE propiedades ADD COLUMN pisos_edificio TINYINT DEFAULT NULL",
    "ALTER TABLE propiedades ADD COLUMN deptos_por_piso TINYINT DEFAULT NULL",
    "ALTER TABLE propiedades ADD COLUMN ascensores_principales TINYINT DEFAULT NULL",
    "ALTER TABLE propiedades ADD COLUMN expensas DECIMAL(12,2) DEFAULT NULL",
    "ALTER TABLE propiedades ADD COLUMN expensas_moneda VARCHAR(5) NOT NULL DEFAULT 'ARS'",
  ];
  for (const sql of cols) {
    await pool.query(sql).catch(e => { if (e.errno !== 1060) console.warn('ensurePropertyCharacteristicsColumns:', e.message); });
  }
}

let _usuariosColumnsMigrated = false;
async function ensureUsuariosColumns() {
  if (_usuariosColumnsMigrated) return;
  await pool.query("ALTER TABLE usuarios ADD COLUMN menu_permisos TEXT DEFAULT NULL").catch(() => {});
  _usuariosColumnsMigrated = true;
}

async function ensureAlertasColumns() {
  const cols = [
    "ALTER TABLE alertas_busqueda ADD COLUMN zona_geografica VARCHAR(100) NOT NULL DEFAULT ''",
    "ALTER TABLE alertas_busqueda ADD COLUMN partido VARCHAR(100) NOT NULL DEFAULT ''",
    "ALTER TABLE alertas_busqueda ADD COLUMN localidad VARCHAR(100) NOT NULL DEFAULT ''",
    "ALTER TABLE alertas_busqueda ADD COLUMN min_bathrooms TINYINT DEFAULT NULL",
    "ALTER TABLE alertas_busqueda ADD COLUMN min_area_m2 DECIMAL(10,2) DEFAULT NULL",
    "ALTER TABLE alertas_busqueda ADD COLUMN min_cocheras TINYINT DEFAULT NULL",
    "ALTER TABLE alertas_busqueda ADD COLUMN servicios_requeridos TEXT DEFAULT NULL",
    "ALTER TABLE alertas_busqueda ADD COLUMN instalaciones_requeridas TEXT DEFAULT NULL",
    "ALTER TABLE alertas_busqueda ADD COLUMN mudanza_inmediata TINYINT(1) NOT NULL DEFAULT 0",
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
       barrio_cerrado,nombre_barrio_cerrado,zona_geografica,partido,localidad,calle,nro_calle,piso,depto,
       mostrar_portales,entre_calles,y_calles,cerca_de,latitud,longitud,
       ancho_terreno,largo_terreno,superficie_terreno,superficie_total,
       superficie_cubierta,superficie_descubierta,superficie_semicubierta,fondo_libre,
       estado_propiedad,antiguedad,a_estrenar,plantas,orientacion,
       agua_caliente,calefaccion,luminosidad,tipo_vigilancia,
       tipo_piso,tipo_techo,tipo_costa,tipo_vista,tipo_pendiente,zonificacion,necesita_reubicacion,
       cocheras_cubiertas,cocheras_descubiertas,cocheras_semicubiertas,
       servicios,instalaciones,servicios_edificio,amenities_edificio,
       apto_credito,apto_profesional,disposicion,categoria_edificio,
       pisos_edificio,deptos_por_piso,ascensores_principales,expensas,expensas_moneda,
       youtube_url,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
    [
      propId, data.agencyId, data.createdByUserId || null, data.title, data.description || '',
      data.operation, data.type, Number(data.price) || 0, data.currency || 'USD',
      `${calle} ${nroCalle}`.trim(), partido, zonaGeografica,
      Number(data.bedrooms) || 0, Number(data.bathrooms) || 0, Number(data.areaM2) || 0,
      data.status || 'publicada',
      data.barrioCerrado === 'true' || data.barrioCerrado === true ? 1 : 0,
      data.nombreBarrioCerrado || '',
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
      data.superficieSemicubierta ? Number(data.superficieSemicubierta) : null,
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
      data.zonificacion || '',
      data.necesitaReubicacion === 'true' || data.necesitaReubicacion === true ? 1 : 0,
      data.cocherasCubiertas ? Number(data.cocherasCubiertas) : null,
      data.cocherasDescubiertas ? Number(data.cocherasDescubiertas) : null,
      data.cocherasSemicubiertas ? Number(data.cocherasSemicubiertas) : null,
      toJsonField(data.servicios),
      toJsonField(data.instalaciones),
      toJsonField(data.serviciosEdificio),
      toJsonField(data.amenitiesEdificio),
      data.aptoCredito === 'true' || data.aptoCredito === true ? 1 : 0,
      data.aptoProf === 'true' || data.aptoProf === true ? 1 : 0,
      data.disposicion || '',
      data.categoriaEdificio || '',
      data.pisosEdificio ? Number(data.pisosEdificio) : null,
      data.deptosPorPiso ? Number(data.deptosPorPiso) : null,
      data.ascensoresPrincipales ? Number(data.ascensoresPrincipales) : null,
      data.expensas ? Number(data.expensas) : null,
      data.expensasMoneda || 'ARS',
      data.youtubeUrl || '',
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
  await pool.query('DELETE FROM compartidas WHERE property_id=?', [propertyId]);
  await pool.query('DELETE FROM propiedad_media WHERE property_id=?', [propertyId]);
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
    nombreBarrioCerrado: 'nombre_barrio_cerrado',
    calle: 'calle', nroCalle: 'nro_calle', piso: 'piso', depto: 'depto',
    mostrarPortales: 'mostrar_portales',
    entreCalles: 'entre_calles', yCalles: 'y_calles', cercaDe: 'cerca_de',
    latitud: 'latitud', longitud: 'longitud',
    anchoTerreno: 'ancho_terreno', largoTerreno: 'largo_terreno',
    superficieTerreno: 'superficie_terreno', superficieTotal: 'superficie_total',
    superficieCubierta: 'superficie_cubierta', superficieDescubierta: 'superficie_descubierta',
    superficieSemicubierta: 'superficie_semicubierta',
    fondoLibre: 'fondo_libre', estadoPropiedad: 'estado_propiedad',
    antiguedad: 'antiguedad', plantas: 'plantas', orientacion: 'orientacion',
    aguaCaliente: 'agua_caliente', calefaccion: 'calefaccion',
    luminosidad: 'luminosidad', tipoVigilancia: 'tipo_vigilancia',
    tipoPiso: 'tipo_piso', tipoTecho: 'tipo_techo',
    tipoCosta: 'tipo_costa', tipoVista: 'tipo_vista', tipoPendiente: 'tipo_pendiente',
    zonificacion: 'zonificacion',
    youtubeUrl: 'youtube_url',
    cocherasCubiertas: 'cocheras_cubiertas',
    cocherasDescubiertas: 'cocheras_descubiertas',
    cocherasSemicubiertas: 'cocheras_semicubiertas',
    disposicion: 'disposicion',
    categoriaEdificio: 'categoria_edificio',
    pisosEdificio: 'pisos_edificio',
    deptosPorPiso: 'deptos_por_piso',
    ascensoresPrincipales: 'ascensores_principales',
    expensas: 'expensas',
    expensasMoneda: 'expensas_moneda',
  };
  if (patch.aptoCredito !== undefined) {
    fields.push('apto_credito=?');
    vals.push(patch.aptoCredito === 'true' || patch.aptoCredito === true ? 1 : 0);
  }
  if (patch.aptoProf !== undefined) {
    fields.push('apto_profesional=?');
    vals.push(patch.aptoProf === 'true' || patch.aptoProf === true ? 1 : 0);
  }
  if (patch.servicios !== undefined) {
    fields.push('servicios=?'); vals.push(toJsonField(patch.servicios));
  }
  if (patch.instalaciones !== undefined) {
    fields.push('instalaciones=?'); vals.push(toJsonField(patch.instalaciones));
  }
  if (patch.serviciosEdificio !== undefined) {
    fields.push('servicios_edificio=?'); vals.push(toJsonField(patch.serviciosEdificio));
  }
  if (patch.amenitiesEdificio !== undefined) {
    fields.push('amenities_edificio=?'); vals.push(toJsonField(patch.amenitiesEdificio));
  }
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

export async function dissolvePartnership(partnershipId) {
  const partnership = await getPartnership(partnershipId);
  if (!partnership) return;
  const { agencyAId, agencyBId } = partnership;
  await pool.query(
    `DELETE FROM compartidas
     WHERE (owner_agency_id=? AND target_agency_id=?)
        OR (owner_agency_id=? AND target_agency_id=?)`,
    [agencyAId, agencyBId, agencyBId, agencyAId]
  );
  await ensureMatchRequestsTable();
  await pool.query(
    `UPDATE match_requests SET status='rechazado'
     WHERE (owner_agency_id=? AND alert_agency_id=?)
        OR (owner_agency_id=? AND alert_agency_id=?)`,
    [agencyAId, agencyBId, agencyBId, agencyAId]
  );
  await pool.query('DELETE FROM sociedades WHERE id=?', [partnershipId]);
}

export async function cancelMatchRequestsForPropertyAndTarget(propertyId, targetAgencyId) {
  await ensureMatchRequestsTable();
  await pool.query(
    `UPDATE match_requests SET status='rechazado'
     WHERE property_id=? AND alert_agency_id=?`,
    [propertyId, targetAgencyId]
  );
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
export async function createPropertyShare({ propertyId, ownerAgencyId, targetAgencyId, percentage, percentageVendedor, percentageComprador, wholeBolsa, shareComment, source }) {
  await ensureCompartidasColumns();
  const [existing] = await pool.query(
    `SELECT * FROM compartidas WHERE property_id=? AND target_agency_id=? AND status<>'rechazada'`,
    [propertyId, targetAgencyId]
  );
  if (existing.length > 0) return toShare(existing[0]);
  const id = uuid();
  const pct = (percentage !== undefined && percentage !== null && percentage !== '') ? Number(percentage) : null;
  const pctV = (percentageVendedor !== undefined && percentageVendedor !== null && percentageVendedor !== '') ? Number(percentageVendedor) : null;
  const pctC = (percentageComprador !== undefined && percentageComprador !== null && percentageComprador !== '') ? Number(percentageComprador) : null;
  const bolsa = wholeBolsa ? 1 : 0;
  const comment = shareComment || null;
  const src = source || 'directa';
  await pool.query(
    `INSERT INTO compartidas (id,property_id,owner_agency_id,target_agency_id,status,web_publish_authorized,percentage,percentage_vendedor,percentage_comprador,toda_bolsa,share_comment,source,created_at)
     VALUES (?,?,?,?,'pendiente',0,?,?,?,?,?,?,NOW())`,
    [id, propertyId, ownerAgencyId, targetAgencyId, pct, pctV, pctC, bolsa, comment, src]
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
  await ensureCompartidasColumns();
  const [rows] = await pool.query(
    "SELECT c.* FROM compartidas c INNER JOIN propiedades p ON p.id = c.property_id WHERE c.status='aceptada' AND c.target_agency_id=?",
    [agencyId]
  );
  return rows.map(toShare);
}

export async function listAcceptedDirectSharesReceived(agencyId) {
  await ensureCompartidasColumns();
  const [rows] = await pool.query(
    "SELECT c.* FROM compartidas c INNER JOIN propiedades p ON p.id = c.property_id WHERE c.status='aceptada' AND c.target_agency_id=? AND (c.source IS NULL OR c.source='directa')",
    [agencyId]
  );
  return rows.map(toShare);
}

export async function listSharesByOwnerAgency(agencyId) {
  const [rows] = await pool.query(
    'SELECT c.* FROM compartidas c INNER JOIN propiedades p ON p.id = c.property_id WHERE c.owner_agency_id=?',
    [agencyId]
  );
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
       zona_geografica,partido,localidad,min_bathrooms,min_area_m2,
       min_cocheras,servicios_requeridos,instalaciones_requeridas,mudanza_inmediata,active,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,NOW())`,
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
      data.minCocheras ? Number(data.minCocheras) : null,
      toJsonField(data.serviciosRequeridos),
      toJsonField(data.instalacionesRequeridas),
      data.mudanzaInmediata ? 1 : 0,
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

// ---------------------------------------------------------------------------
// Match Requests — flujo de aceptar/rechazar antes de ver la propiedad
// ---------------------------------------------------------------------------
let matchRequestsTableEnsured = false;
async function ensureMatchRequestsTable() {
  if (matchRequestsTableEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS match_requests (
      id VARCHAR(36) PRIMARY KEY,
      alert_id VARCHAR(36) NOT NULL,
      alert_agency_id VARCHAR(36) NOT NULL,
      property_id VARCHAR(36) NOT NULL,
      owner_agency_id VARCHAR(36) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pendiente',
      alertee_status VARCHAR(20) NULL,
      created_at DATETIME NOT NULL,
      responded_at DATETIME NULL,
      UNIQUE KEY uq_alert_property (alert_id, property_id)
    )
  `);
  try { await pool.query(`ALTER TABLE match_requests ADD COLUMN alertee_status VARCHAR(20) NULL`); } catch (_) {}
  matchRequestsTableEnsured = true;
}

async function createMatchRequestIfNotExists(alertId, alertAgencyId, propertyId, ownerAgencyId) {
  await ensureMatchRequestsTable();
  const id = uuid();
  await pool.query(
    `INSERT IGNORE INTO match_requests (id, alert_id, alert_agency_id, property_id, owner_agency_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pendiente', NOW())`,
    [id, alertId, alertAgencyId, propertyId, ownerAgencyId]
  );
}

export async function syncMatchRequestsForAlert(alertId, alertAgencyId) {
  const alert = await getSearchAlert(alertId);
  if (!alert || !alert.active) return;
  const allAgencies = await listAgencies();
  const otherIds = allAgencies.map(a => a.id).filter(id => id !== alertAgencyId);
  for (const otherId of otherIds) {
    const props = (await listPropertiesByAgency(otherId)).filter(p => p.status === 'publicada');
    for (const property of props) {
      if (propertyMatchesAlert(property, alert)) {
        await createMatchRequestIfNotExists(alertId, alertAgencyId, property.id, otherId);
      }
    }
  }
}

export async function syncMatchRequestsForProperty(property) {
  if (property.status !== 'publicada') return;
  const allAgencies = await listAgencies();
  const otherIds = allAgencies.map(a => a.id).filter(id => id !== property.agencyId);
  if (otherIds.length === 0) return;
  const placeholders = otherIds.map(() => '?').join(',');
  const [alertRows] = await pool.query(
    `SELECT * FROM alertas_busqueda WHERE active=1 AND agency_id IN (${placeholders})`, otherIds
  );
  const alerts = alertRows.map(toAlert);
  for (const alert of alerts) {
    if (propertyMatchesAlert(property, alert)) {
      await createMatchRequestIfNotExists(alert.id, alert.agencyId, property.id, property.agencyId);
    }
  }
}

export async function listPendingMatchRequestsForOwner(ownerAgencyId) {
  await ensureMatchRequestsTable();
  const [rows] = await pool.query(
    `SELECT * FROM match_requests WHERE owner_agency_id=? AND status='pendiente' ORDER BY created_at DESC`,
    [ownerAgencyId]
  );
  return rows.map(toMatchRequest);
}

export async function getMatchRequest(matchRequestId) {
  await ensureMatchRequestsTable();
  const [rows] = await pool.query('SELECT * FROM match_requests WHERE id=?', [matchRequestId]);
  return toMatchRequest(rows[0] || null);
}

export async function respondMatchRequest(matchRequestId, status) {
  await pool.query(
    'UPDATE match_requests SET status=?, responded_at=NOW() WHERE id=?',
    [status, matchRequestId]
  );
  return getMatchRequest(matchRequestId);
}

export async function listPendingAlerteeMatchRequests(alertAgencyId) {
  await ensureMatchRequestsTable();
  const [rows] = await pool.query(
    `SELECT * FROM match_requests WHERE alert_agency_id=? AND status='aceptado' AND alertee_status IS NULL ORDER BY responded_at DESC`,
    [alertAgencyId]
  );
  return rows.map(toMatchRequest);
}

export async function respondAlerteeMatchRequest(matchRequestId, alerteeStatus) {
  await ensureMatchRequestsTable();
  await pool.query(
    'UPDATE match_requests SET alertee_status=? WHERE id=?',
    [alerteeStatus, matchRequestId]
  );
  return getMatchRequest(matchRequestId);
}

export async function listAlertsWithMatchCounts(agencyId) {
  await ensureMatchRequestsTable();
  const alerts = await listAlertsByAgency(agencyId);
  if (alerts.length === 0) return [];
  const alertIds = alerts.map(a => a.id);
  const placeholders = alertIds.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT alert_id, COUNT(*) as cnt FROM match_requests
     WHERE alert_id IN (${placeholders}) AND status='aceptado' AND alertee_status='aceptado'
     GROUP BY alert_id`,
    alertIds
  );
  const countMap = {};
  rows.forEach(r => { countMap[r.alert_id] = Number(r.cnt); });
  return alerts.map(a => ({ ...a, matchCount: countMap[a.id] || 0 }));
}

export async function findMatchingPropertiesForAlert(alertId, requestingAgencyId) {
  await ensureMatchRequestsTable();
  const alert = await getSearchAlert(alertId);
  if (!alert || alert.agencyId !== requestingAgencyId) return [];
  const [rows] = await pool.query(
    `SELECT property_id, owner_agency_id FROM match_requests WHERE alert_id=? AND status='aceptado' AND alertee_status='aceptado'`,
    [alertId]
  );
  const results = [];
  for (const row of rows) {
    const property = await getProperty(row.property_id);
    if (property && property.status === 'publicada') {
      results.push({ property, ownerAgencyId: row.owner_agency_id });
    }
  }
  return results;
}

function propertyMatchesAlert(property, alert) {
  if (property.status !== 'publicada') return false;
  // Tipo de operación
  if (alert.operation && property.operation !== alert.operation) return false;
  // Partido
  if (alert.partido && property.partido !== alert.partido) return false;
  // Moneda y rango de precio
  if (alert.currency) {
    if (property.currency !== alert.currency) return false;
    if (alert.minPrice && Number(property.price) < Number(alert.minPrice)) return false;
    if (alert.maxPrice && Number(property.price) > Number(alert.maxPrice)) return false;
  }
  // Cantidad de ambientes (dormitorios)
  if (alert.minBedrooms && Number(property.bedrooms) < Number(alert.minBedrooms)) return false;
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

  await ensureMatchRequestsTable();
  const myPropertyIds = myProperties.map(p => p.id);
  let existingMatchRequests = [];
  if (myPropertyIds.length > 0) {
    const ph = myPropertyIds.map(() => '?').join(',');
    const [mrRows] = await pool.query(
      `SELECT alert_id, property_id FROM match_requests WHERE property_id IN (${ph}) AND status<>'rechazado'`,
      myPropertyIds
    );
    existingMatchRequests = mrRows;
  }

  const matches = [];
  for (const partnerAgencyId of partnerIds) {
    const alerts = partnerAlerts.filter(a => a.agencyId === partnerAgencyId);
    for (const property of myProperties) {
      const alreadyShared = existingShares.some(
        s => s.propertyId === property.id && s.targetAgencyId === partnerAgencyId
      );
      if (alreadyShared) continue;
      for (const alert of alerts) {
        const alreadyMatched = existingMatchRequests.some(
          mr => mr.property_id === property.id && mr.alert_id === alert.id
        );
        if (alreadyMatched) continue;
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
  const allAgencies = await listAgencies();
  const otherIds = allAgencies.map(a => a.id).filter(id => id !== ownerAgencyId);
  if (otherIds.length === 0) return [];

  const placeholders = otherIds.map(() => '?').join(',');
  const [alertRows] = await pool.query(
    `SELECT * FROM alertas_busqueda WHERE active=1 AND agency_id IN (${placeholders})`, otherIds
  );
  const otherAlerts = alertRows.map(toAlert);
  if (otherAlerts.length === 0) return [];

  const [shareRows] = await pool.query(
    `SELECT * FROM compartidas WHERE owner_agency_id=? AND property_id=? AND status<>'rechazada'`,
    [ownerAgencyId, property.id]
  );
  const existingShares = shareRows.map(toShare);

  const matches = [];
  for (const alert of otherAlerts) {
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
let _invitacionesColumnsMigrated = false;
async function ensureInvitacionesColumns() {
  if (_invitacionesColumnsMigrated) return;
  await pool.query("ALTER TABLE invitaciones ADD COLUMN menu_permisos TEXT DEFAULT NULL").catch(() => {});
  _invitacionesColumnsMigrated = true;
}

export async function createInvitation({ agencyId, role, note, menuPermisos }) {
  await ensureInvitacionesColumns();
  const token = randomBytes(16).toString('hex');
  const id = uuid();
  const permisoVal = menuPermisos ? JSON.stringify(menuPermisos) : null;
  await pool.query(
    `INSERT INTO invitaciones (id,agency_id,role,note,token,status,menu_permisos,created_at)
     VALUES (?,?,?,?,?,'pendiente',?,NOW())`,
    [id, agencyId, role === 'admin' ? 'admin' : 'agente', note || '', token, permisoVal]
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

// ---------------------------------------------------------------------------
// Grupos de socios
// ---------------------------------------------------------------------------
async function ensureGruposSociosTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS grupos_socios (
      id VARCHAR(36) PRIMARY KEY,
      agency_id VARCHAR(36) NOT NULL,
      name VARCHAR(120) NOT NULL,
      created_at DATETIME NOT NULL
    )
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS grupos_socios_members (
      grupo_id VARCHAR(36) NOT NULL,
      partner_id VARCHAR(36) NOT NULL,
      PRIMARY KEY (grupo_id, partner_id)
    )
  `).catch(() => {});
}

function toGrupo(row, members = []) {
  if (!row) return null;
  return { id: row.id, agencyId: row.agency_id, name: row.name, createdAt: row.created_at, members };
}

export async function createGrupoSocios({ agencyId, name }) {
  await ensureGruposSociosTable();
  const id = uuid();
  await pool.query(
    `INSERT INTO grupos_socios (id, agency_id, name, created_at) VALUES (?, ?, ?, NOW())`,
    [id, agencyId, name]
  );
  return getGrupoSocios(id);
}

export async function getGrupoSocios(grupoId) {
  await ensureGruposSociosTable();
  const [rows] = await pool.query('SELECT * FROM grupos_socios WHERE id=?', [grupoId]);
  if (!rows[0]) return null;
  const [memberRows] = await pool.query('SELECT partner_id FROM grupos_socios_members WHERE grupo_id=?', [grupoId]);
  return toGrupo(rows[0], memberRows.map(r => r.partner_id));
}

export async function listGruposSocios(agencyId) {
  await ensureGruposSociosTable();
  const [rows] = await pool.query('SELECT * FROM grupos_socios WHERE agency_id=? ORDER BY created_at ASC', [agencyId]);
  return Promise.all(rows.map(async row => {
    const [memberRows] = await pool.query('SELECT partner_id FROM grupos_socios_members WHERE grupo_id=?', [row.id]);
    return toGrupo(row, memberRows.map(r => r.partner_id));
  }));
}

export async function updateGrupoSocios(grupoId, name) {
  await ensureGruposSociosTable();
  await pool.query('UPDATE grupos_socios SET name=? WHERE id=?', [name, grupoId]);
  return getGrupoSocios(grupoId);
}

export async function deleteGrupoSocios(grupoId) {
  await ensureGruposSociosTable();
  await pool.query('DELETE FROM grupos_socios_members WHERE grupo_id=?', [grupoId]);
  await pool.query('DELETE FROM grupos_socios WHERE id=?', [grupoId]);
}

export async function addMemberToGrupo(grupoId, partnerId) {
  await ensureGruposSociosTable();
  await pool.query(
    'INSERT IGNORE INTO grupos_socios_members (grupo_id, partner_id) VALUES (?, ?)',
    [grupoId, partnerId]
  );
}

export async function removeMemberFromGrupo(grupoId, partnerId) {
  await ensureGruposSociosTable();
  await pool.query('DELETE FROM grupos_socios_members WHERE grupo_id=? AND partner_id=?', [grupoId, partnerId]);
}
