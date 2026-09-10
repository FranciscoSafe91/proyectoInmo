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
    createdAt: r.created_at, respondedAt: r.responded_at,
  };
}

function toAlert(r) {
  if (!r) return null;
  return {
    id: r.id, agencyId: r.agency_id, title: r.title,
    operation: r.operation, type: r.type, city: r.city, currency: r.currency,
    minPrice: r.min_price, maxPrice: r.max_price, minBedrooms: r.min_bedrooms,
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
async function ensurePropertyMediaTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS propiedad_media (
      id          VARCHAR(36) PRIMARY KEY,
      property_id VARCHAR(36) NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
      url         VARCHAR(500) NOT NULL,
      type        VARCHAR(20)  NOT NULL,
      filename    VARCHAR(255) DEFAULT '',
      sort_order  INTEGER      DEFAULT 0,
      created_at  TIMESTAMPTZ  DEFAULT NOW()
    )
  `);
}

export async function createProperty(data) {
  const propId = uuid();
  await pool.query(
    `INSERT INTO propiedades (id,agency_id,created_by_user_id,title,description,operation,type,price,currency,address,city,province,bedrooms,bathrooms,area_m2,status,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
    [
      propId, data.agencyId, data.createdByUserId || null, data.title, data.description || '',
      data.operation, data.type, Number(data.price) || 0, data.currency || 'USD',
      data.address || '', data.city || '', data.province || '',
      Number(data.bedrooms) || 0, Number(data.bathrooms) || 0, Number(data.areaM2) || 0,
      data.status || 'publicada',
    ]
  );
  return getProperty(propId);
}

export async function createPropertyMedia({ propertyId, url, type, filename, sortOrder }) {
  await ensurePropertyMediaTable();
  const { rows } = await pool.query(
    `INSERT INTO propiedad_media (id,property_id,url,type,filename,sort_order,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,
    [uuid(), propertyId, url, type, filename || '', Number(sortOrder) || 0]
  );
  return toPropertyMedia(rows[0]);
}

export async function listPropertyMedia(propertyId) {
  await ensurePropertyMediaTable();
  const { rows } = await pool.query(
    'SELECT * FROM propiedad_media WHERE property_id=$1 ORDER BY sort_order ASC, created_at ASC',
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

export async function updateProperty(propertyId, patch) {
  const fields = [];
  const vals = [];
  const map = {
    title: 'title', description: 'description', operation: 'operation', type: 'type',
    price: 'price', currency: 'currency', address: 'address', city: 'city',
    province: 'province', bedrooms: 'bedrooms', bathrooms: 'bathrooms',
    areaM2: 'area_m2', status: 'status',
  };
  for (const [key, col] of Object.entries(map)) {
    if (patch[key] !== undefined) { fields.push(`${col}=?`); vals.push(patch[key]); }
  }
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
export async function createPropertyShare({ propertyId, ownerAgencyId, targetAgencyId }) {
  const [existing] = await pool.query(
    `SELECT * FROM compartidas WHERE property_id=? AND target_agency_id=? AND status<>'rechazada'`,
    [propertyId, targetAgencyId]
  );
  if (existing.length > 0) return toShare(existing[0]);
  const id = uuid();
  await pool.query(
    `INSERT INTO compartidas (id,property_id,owner_agency_id,target_agency_id,status,web_publish_authorized,created_at)
     VALUES (?,?,?,?,'pendiente',0,NOW())`,
    [id, propertyId, ownerAgencyId, targetAgencyId]
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

export async function respondPropertyShare(shareId, status) {
  await pool.query('UPDATE compartidas SET status=?, responded_at=NOW() WHERE id=?', [status, shareId]);
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
  const id = uuid();
  await pool.query(
    `INSERT INTO alertas_busqueda (id,agency_id,title,operation,type,city,currency,min_price,max_price,min_bedrooms,active,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,1,NOW())`,
    [
      id, data.agencyId, data.title || '', data.operation || '', data.type || '',
      (data.city || '').trim(), data.currency || '',
      data.minPrice ? Number(data.minPrice) : null,
      data.maxPrice ? Number(data.maxPrice) : null,
      data.minBedrooms ? Number(data.minBedrooms) : null,
    ]
  );
  return getSearchAlert(id);
}

export async function getSearchAlert(alertId) {
  const [rows] = await pool.query('SELECT * FROM alertas_busqueda WHERE id=?', [alertId]);
  return toAlert(rows[0] || null);
}

export async function listAlertsByAgency(agencyId) {
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
  if (alert.city && !property.city.toLowerCase().includes(alert.city.toLowerCase())) return false;
  if (alert.currency) {
    if (property.currency !== alert.currency) return false;
    if (alert.minPrice && property.price < alert.minPrice) return false;
    if (alert.maxPrice && property.price > alert.maxPrice) return false;
  }
  if (alert.minBedrooms && property.bedrooms < alert.minBedrooms) return false;
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
