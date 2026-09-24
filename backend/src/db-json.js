import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'db.json');
const TRIAL_DAYS = 14;
const BILLING_PERIOD_DAYS = 30;

const EMPTY_DB = {
  agencies: [],
  users: [],
  properties: [],
  propertyMedia: [],
  partnerships: [],
  propertyShares: [],
  searchAlerts: [],
  plan: { name: 'Plan Mensual', priceARS: 15000 },
  subscriptions: [],
  payments: [],
  invitations: [],
  supportTickets: [],
  sessions: [],
  passwordResetTokens: [],
};

function uuid() { return randomUUID(); }
function now() { return new Date().toISOString(); }
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
function generateApiKey() { return randomBytes(24).toString('hex'); }
function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function normalize(value) { return String(value || '').trim().toLowerCase(); }
function ensureDbShape(db) {
  for (const [key, value] of Object.entries(EMPTY_DB)) {
    if (db[key] === undefined) db[key] = Array.isArray(value) ? [] : clone(value);
  }
  return db;
}
function readDb() {
  if (!existsSync(DB_PATH)) return clone(EMPTY_DB);
  return ensureDbShape(JSON.parse(readFileSync(DB_PATH, 'utf8')));
}
function writeDb(db) {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  writeFileSync(DB_PATH, `${JSON.stringify(ensureDbShape(db), null, 2)}\n`);
}
function agencyById(db, id) { return db.agencies.find(a => a.id === id) || null; }
function userById(db, id) { return db.users.find(u => u.id === id) || null; }
function propertyById(db, id) { return db.properties.find(p => p.id === id) || null; }
function shareById(db, id) { return db.propertyShares.find(s => s.id === id) || null; }
function partnershipById(db, id) { return db.partnerships.find(p => p.id === id) || null; }
function alertById(db, id) { return db.searchAlerts.find(a => a.id === id) || null; }

export async function resetDatabase() {
  writeDb(clone(EMPTY_DB));
}

export async function createAgency({ name, slug, email, phone, city, accountType }) {
  const db = readDb();
  const agency = {
    id: uuid(),
    name,
    slug,
    email,
    phone: phone || '',
    city: city || '',
    accountType: accountType === 'agente_independiente' ? 'agente_independiente' : 'inmobiliaria',
    logoPath: null,
    brandColor: '#1f6f54',
    apiKey: generateApiKey(),
    createdAt: now(),
  };
  db.agencies.push(agency);
  db.subscriptions.push({
    id: uuid(),
    agencyId: agency.id,
    status: 'trial',
    trialEndsAt: addDays(now(), TRIAL_DAYS),
    currentPeriodEnd: null,
    mpPreapprovalId: null,
    createdAt: now(),
  });
  writeDb(db);
  return clone(agency);
}

export async function getAgency(agencyId) {
  return clone(agencyById(readDb(), agencyId));
}

export async function updateAgency(agencyId, patch) {
  const db = readDb();
  const agency = agencyById(db, agencyId);
  if (!agency) return null;
  Object.assign(agency, patch);
  writeDb(db);
  return clone(agency);
}

export async function verifyAgencyApiKey(agencyId, apiKey) {
  const agency = agencyById(readDb(), agencyId);
  return agency && agency.apiKey && apiKey && agency.apiKey === String(apiKey) ? clone(agency) : null;
}

export async function regenerateApiKey(agencyId) {
  return updateAgency(agencyId, { apiKey: generateApiKey() });
}

export async function findAgencyByEmail(email) {
  return clone(readDb().agencies.find(a => normalize(a.email) === normalize(email)) || null);
}

export async function findAgencyBySlug(slug) {
  return clone(readDb().agencies.find(a => a.slug === slug) || null);
}

export async function listAgencies() {
  return clone(readDb().agencies.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))));
}

export async function searchAgencies(query, excludeAgencyId) {
  const q = normalize(query);
  return clone(readDb().agencies.filter(a =>
    a.id !== excludeAgencyId && (!q || normalize(`${a.name} ${a.city}`).includes(q))
  ));
}

export async function createUser({ agencyId, name, nombre, apellido, documento, email, username, accountType, agencyName, direccion, passwordHash, passwordSalt, role, isPlatformAdmin }) {
  const db = readDb();
  const fullName = name || `${nombre || ''} ${apellido || ''}`.trim();
  const user = {
    id: uuid(),
    agencyId,
    name: fullName,
    nombre: nombre || fullName,
    apellido: apellido || '',
    documento: documento || '',
    email,
    username: username || '',
    accountType: accountType || 'inmobiliaria',
    agencyName: agencyName || '',
    direccion: direccion || '',
    passwordHash,
    passwordSalt,
    role: role || 'admin',
    isPlatformAdmin: Boolean(isPlatformAdmin),
    createdAt: now(),
  };
  db.users.push(user);
  writeDb(db);
  return clone(user);
}

export async function findUserByEmail(email) {
  return clone(readDb().users.find(u => normalize(u.email) === normalize(email)) || null);
}

export async function getUser(userId) {
  return clone(userById(readDb(), userId));
}

export async function listUsersByAgency(agencyId) {
  return clone(readDb().users.filter(u => u.agencyId === agencyId));
}

export async function countAdminsInAgency(agencyId) {
  return readDb().users.filter(u => u.agencyId === agencyId && u.role === 'admin').length;
}

export async function deleteUser(userId) {
  const db = readDb();
  db.sessions = db.sessions.filter(s => s.userId !== userId);
  db.users = db.users.filter(u => u.id !== userId);
  writeDb(db);
}

export async function updateUserRole(userId, role) {
  const db = readDb();
  const user = userById(db, userId);
  if (!user) return null;
  user.role = role === 'admin' ? 'admin' : 'agente';
  writeDb(db);
  return clone(user);
}

export async function updateUserPassword(userId, passwordHash, passwordSalt) {
  const db = readDb();
  const user = userById(db, userId);
  if (!user) return null;
  user.passwordHash = passwordHash;
  user.passwordSalt = passwordSalt;
  writeDb(db);
  return clone(user);
}

export async function createPasswordResetToken(userId) {
  const db = readDb();
  const token = randomBytes(32).toString('hex');
  db.passwordResetTokens = db.passwordResetTokens.filter(t => t.userId !== userId);
  db.passwordResetTokens.push({ token, userId, expiresAt: addDays(now(), 1 / 24), createdAt: now() });
  writeDb(db);
  return token;
}

export async function getPasswordResetToken(token) {
  const match = readDb().passwordResetTokens.find(t => t.token === token && new Date(t.expiresAt) > new Date());
  return clone(match || null);
}

export async function deletePasswordResetToken(token) {
  const db = readDb();
  db.passwordResetTokens = db.passwordResetTokens.filter(t => t.token !== token);
  writeDb(db);
}

export async function createSession(userId) {
  const db = readDb();
  const token = uuid();
  db.sessions.push({ token, userId, createdAt: now() });
  writeDb(db);
  return token;
}

export async function getSession(token) {
  return clone(readDb().sessions.find(s => s.token === token) || null);
}

export async function deleteSession(token) {
  const db = readDb();
  db.sessions = db.sessions.filter(s => s.token !== token);
  writeDb(db);
}

export async function createProperty(data) {
  const db = readDb();
  const property = {
    id: uuid(),
    agencyId: data.agencyId,
    createdByUserId: data.createdByUserId || null,
    title: data.title,
    description: data.description || '',
    operation: data.operation || '',
    type: data.type || '',
    price: Number(data.price) || 0,
    currency: data.currency || 'USD',
    address: data.address || '',
    city: data.city || '',
    province: data.province || '',
    bedrooms: Number(data.bedrooms) || 0,
    bathrooms: Number(data.bathrooms) || 0,
    areaM2: Number(data.areaM2) || 0,
    status: data.status || 'publicada',
    ...data,
    createdAt: now(),
    updatedAt: now(),
  };
  db.properties.push(property);
  writeDb(db);
  return clone(property);
}

export async function createPropertyMedia({ propertyId, url, type, filename, sortOrder }) {
  const db = readDb();
  const media = { id: uuid(), propertyId, url, type, filename, sortOrder: Number(sortOrder) || 0, createdAt: now() };
  db.propertyMedia.push(media);
  writeDb(db);
  return clone(media);
}

export async function listPropertyMedia(propertyId) {
  return clone(readDb().propertyMedia.filter(m => m.propertyId === propertyId).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
}

export async function getProperty(propertyId) {
  return clone(propertyById(readDb(), propertyId));
}

export async function listPropertiesByAgency(agencyId) {
  return clone(readDb().properties.filter(p => p.agencyId === agencyId).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
}

export async function listPropertiesByUser(agencyId, userId) {
  return clone(readDb().properties.filter(p => p.agencyId === agencyId && (!p.createdByUserId || p.createdByUserId === userId)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
}

export async function deleteProperty(propertyId) {
  const db = readDb();
  db.properties = db.properties.filter(p => p.id !== propertyId);
  db.propertyMedia = db.propertyMedia.filter(m => m.propertyId !== propertyId);
  db.propertyShares = db.propertyShares.filter(s => s.propertyId !== propertyId);
  writeDb(db);
}

export async function updateProperty(propertyId, patch) {
  const db = readDb();
  const property = propertyById(db, propertyId);
  if (!property) return null;
  Object.assign(property, patch, { updatedAt: now() });
  writeDb(db);
  return clone(property);
}

export async function arePartners(agencyAId, agencyBId) {
  return Boolean(readDb().partnerships.find(p =>
    p.status === 'aceptada' &&
    ((p.agencyAId === agencyAId && p.agencyBId === agencyBId) || (p.agencyAId === agencyBId && p.agencyBId === agencyAId))
  ));
}

export async function findPartnership(agencyAId, agencyBId) {
  return clone(readDb().partnerships.find(p =>
    (p.agencyAId === agencyAId && p.agencyBId === agencyBId) || (p.agencyAId === agencyBId && p.agencyBId === agencyAId)
  ) || null);
}

export async function createPartnershipRequest({ fromAgencyId, toAgencyId }) {
  const db = readDb();
  const partnership = { id: uuid(), agencyAId: fromAgencyId, agencyBId: toAgencyId, requestedBy: fromAgencyId, status: 'pendiente', createdAt: now(), respondedAt: null };
  db.partnerships.push(partnership);
  writeDb(db);
  return clone(partnership);
}

export async function getPartnership(partnershipId) {
  return clone(partnershipById(readDb(), partnershipId));
}

export async function respondPartnership(partnershipId, status) {
  const db = readDb();
  const partnership = partnershipById(db, partnershipId);
  if (!partnership) return null;
  partnership.status = status;
  partnership.respondedAt = now();
  writeDb(db);
  return clone(partnership);
}

export async function listPartnersOfAgency(agencyId) {
  return readDb().partnerships
    .filter(p => p.status === 'aceptada' && (p.agencyAId === agencyId || p.agencyBId === agencyId))
    .map(p => p.agencyAId === agencyId ? p.agencyBId : p.agencyAId);
}

export async function listPendingPartnershipRequestsReceived(agencyId) {
  return clone(readDb().partnerships.filter(p => p.status === 'pendiente' && p.agencyBId === agencyId));
}

export async function listPendingPartnershipRequestsSent(agencyId) {
  return clone(readDb().partnerships.filter(p => p.status === 'pendiente' && p.agencyAId === agencyId));
}

export async function createPropertyShare({ propertyId, ownerAgencyId, targetAgencyId, percentage }) {
  const db = readDb();
  const existing = db.propertyShares.find(s => s.propertyId === propertyId && s.targetAgencyId === targetAgencyId && s.status !== 'rechazada');
  if (existing) return clone(existing);
  const share = {
    id: uuid(),
    propertyId,
    ownerAgencyId,
    targetAgencyId,
    status: 'pendiente',
    webPublishAuthorized: false,
    percentage: percentage !== undefined && percentage !== '' ? Number(percentage) : null,
    rejectionReason: null,
    createdAt: now(),
    respondedAt: null,
  };
  db.propertyShares.push(share);
  writeDb(db);
  return clone(share);
}

export async function getPropertyShare(shareId) {
  return clone(shareById(readDb(), shareId));
}

export async function getShareForPropertyAndTarget(propertyId, targetAgencyId) {
  return clone(readDb().propertyShares.find(s => s.propertyId === propertyId && s.targetAgencyId === targetAgencyId) || null);
}

export async function setSharePublishAuthorization(shareId, authorized) {
  const db = readDb();
  const share = shareById(db, shareId);
  if (!share) return null;
  share.webPublishAuthorized = Boolean(authorized);
  writeDb(db);
  return clone(share);
}

export async function cancelShare(shareId) {
  const db = readDb();
  db.propertyShares = db.propertyShares.filter(s => s.id !== shareId);
  writeDb(db);
}

export async function respondPropertyShare(shareId, status, rejectionReason) {
  const db = readDb();
  const share = shareById(db, shareId);
  if (!share) return null;
  share.status = status;
  share.respondedAt = now();
  if (status === 'rechazada') share.rejectionReason = rejectionReason || '';
  writeDb(db);
  return clone(share);
}

export async function listSharesForProperty(propertyId) {
  return clone(readDb().propertyShares.filter(s => s.propertyId === propertyId));
}

export async function listPendingSharesReceived(agencyId) {
  return clone(readDb().propertyShares.filter(s => s.status === 'pendiente' && s.targetAgencyId === agencyId));
}

export async function listAcceptedSharesReceived(agencyId) {
  return clone(readDb().propertyShares.filter(s => s.status === 'aceptada' && s.targetAgencyId === agencyId));
}

export async function listSharesByOwnerAgency(agencyId) {
  return clone(readDb().propertyShares.filter(s => s.ownerAgencyId === agencyId));
}

export async function createSearchAlert(data) {
  const db = readDb();
  const alert = {
    id: uuid(),
    agencyId: data.agencyId,
    title: data.title || '',
    operation: data.operation || '',
    type: data.type || '',
    city: (data.city || '').trim(),
    currency: data.currency || '',
    minPrice: data.minPrice ? Number(data.minPrice) : null,
    maxPrice: data.maxPrice ? Number(data.maxPrice) : null,
    minBedrooms: data.minBedrooms ? Number(data.minBedrooms) : null,
    zonaGeografica: data.zonaGeografica || '',
    partido: data.partido || '',
    localidad: data.localidad || '',
    minBathrooms: data.minBathrooms ? Number(data.minBathrooms) : null,
    minAreaM2: data.minAreaM2 ? Number(data.minAreaM2) : null,
    minCocheras: data.minCocheras ? Number(data.minCocheras) : null,
    serviciosRequeridos: data.serviciosRequeridos || [],
    instalacionesRequeridas: data.instalacionesRequeridas || [],
    active: true,
    createdAt: now(),
  };
  db.searchAlerts.push(alert);
  writeDb(db);
  return clone(alert);
}

export async function getSearchAlert(alertId) {
  return clone(alertById(readDb(), alertId));
}

export async function listAlertsByAgency(agencyId) {
  return clone(readDb().searchAlerts.filter(a => a.agencyId === agencyId).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
}

export async function setSearchAlertActive(alertId, active) {
  const db = readDb();
  const alert = alertById(db, alertId);
  if (!alert) return null;
  alert.active = Boolean(active);
  writeDb(db);
  return clone(alert);
}

export async function listAlertsWithMatchCounts(agencyId) {
  const alerts = await listAlertsByAgency(agencyId);
  if (alerts.length === 0) return [];
  const partnerIds = await listPartnersOfAgency(agencyId);
  if (partnerIds.length === 0) return alerts.map(a => ({ ...a, matchCount: 0 }));
  const db = readDb();
  const allPartnerProps = db.properties.filter(p => partnerIds.includes(p.agencyId) && p.status === 'publicada');
  return alerts.map(alert => ({
    ...alert,
    matchCount: allPartnerProps.filter(p => propertyMatchesAlert(p, alert)).length,
  }));
}

export async function findMatchingPropertiesForAlert(alertId, requestingAgencyId) {
  const alert = await getSearchAlert(alertId);
  if (!alert || alert.agencyId !== requestingAgencyId) return [];
  const partnerIds = await listPartnersOfAgency(requestingAgencyId);
  if (partnerIds.length === 0) return [];
  const db = readDb();
  const results = [];
  for (const partnerId of partnerIds) {
    const props = db.properties.filter(p => p.agencyId === partnerId && p.status === 'publicada');
    for (const property of props) {
      if (propertyMatchesAlert(property, alert)) {
        results.push({ property: clone(property), ownerAgencyId: partnerId });
      }
    }
  }
  return results;
}

export async function deleteSearchAlert(alertId) {
  const db = readDb();
  db.searchAlerts = db.searchAlerts.filter(a => a.id !== alertId);
  writeDb(db);
}

function propertyMatchesAlert(property, alert) {
  if (property.status !== 'publicada') return false;
  if (alert.operation && property.operation !== alert.operation) return false;
  if (alert.type && property.type !== alert.type) return false;
  if (alert.zonaGeografica && property.zonaGeografica !== alert.zonaGeografica) return false;
  if (alert.partido && property.partido !== alert.partido) return false;
  if (alert.localidad && property.localidad !== alert.localidad) return false;
  if (!alert.zonaGeografica && alert.city && !normalize(`${property.city} ${property.localidad} ${property.partido} ${property.zonaGeografica}`).includes(normalize(alert.city))) return false;
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
  const db = readDb();
  const myProperties = db.properties.filter(p => p.agencyId === ownerAgencyId && p.status === 'publicada');
  const partnerIds = await listPartnersOfAgency(ownerAgencyId);
  const partnerAlerts = db.searchAlerts.filter(a => a.active && partnerIds.includes(a.agencyId));
  const existingShares = db.propertyShares.filter(s => s.ownerAgencyId === ownerAgencyId && s.status !== 'rechazada');
  const matches = [];
  for (const property of myProperties) {
    for (const alert of partnerAlerts) {
      const alreadyShared = existingShares.some(s => s.propertyId === property.id && s.targetAgencyId === alert.agencyId);
      if (!alreadyShared && propertyMatchesAlert(property, alert)) matches.push({ alert, property, requestingAgencyId: alert.agencyId });
    }
  }
  return clone(matches);
}

export async function findMatchingAlertsForProperty(property, ownerAgencyId) {
  if (!property || property.status !== 'publicada') return [];
  const db = readDb();
  const partnerIds = await listPartnersOfAgency(ownerAgencyId);
  const partnerAlerts = db.searchAlerts.filter(a => a.active && partnerIds.includes(a.agencyId));
  const existingShares = db.propertyShares.filter(s => s.ownerAgencyId === ownerAgencyId && s.propertyId === property.id && s.status !== 'rechazada');
  return clone(partnerAlerts
    .filter(alert => !existingShares.some(s => s.targetAgencyId === alert.agencyId) && propertyMatchesAlert(property, alert))
    .map(alert => ({ alert, requestingAgencyId: alert.agencyId })));
}

export async function listFeedPropertiesForAgency(agencyId) {
  const db = readDb();
  const own = db.properties
    .filter(p => p.agencyId === agencyId && p.status === 'publicada')
    .map(property => ({ property, source: 'propia', ownerAgencyId: agencyId }));
  const shared = db.propertyShares
    .filter(s => s.targetAgencyId === agencyId && s.status === 'aceptada' && s.webPublishAuthorized)
    .map(s => ({ property: propertyById(db, s.propertyId), source: 'compartida', ownerAgencyId: s.ownerAgencyId }))
    .filter(item => item.property && item.property.status === 'publicada');
  return clone([...own, ...shared]);
}

export async function getPlan() {
  return clone(readDb().plan || EMPTY_DB.plan);
}

export async function updatePlan(patch) {
  const db = readDb();
  db.plan = { ...(db.plan || EMPTY_DB.plan), ...patch };
  writeDb(db);
  return clone(db.plan);
}

export async function createTrialSubscription(agencyId) {
  const db = readDb();
  const subscription = { id: uuid(), agencyId, status: 'trial', trialEndsAt: addDays(now(), TRIAL_DAYS), currentPeriodEnd: null, mpPreapprovalId: null, createdAt: now() };
  db.subscriptions.push(subscription);
  writeDb(db);
  return clone(subscription);
}

export async function getSubscriptionByAgency(agencyId) {
  return clone(readDb().subscriptions.find(s => s.agencyId === agencyId) || null);
}

export async function updateSubscription(agencyId, patch) {
  const db = readDb();
  const subscription = db.subscriptions.find(s => s.agencyId === agencyId);
  if (!subscription) return null;
  Object.assign(subscription, patch);
  writeDb(db);
  return clone(subscription);
}

export function effectiveSubscriptionStatus(subscription) {
  if (!subscription) return 'sin_suscripcion';
  if (subscription.status === 'cancelada') return 'cancelada';
  const nowD = new Date();
  if (subscription.status === 'trial') return new Date(subscription.trialEndsAt) > nowD ? 'trial' : 'vencida';
  if (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < nowD) return 'vencida';
  return 'activa';
}

export async function applySuccessfulPayment(agencyId, { amount, currency, method, mpPaymentId }) {
  const subscription = await getSubscriptionByAgency(agencyId);
  if (!subscription) return null;
  const base = subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) > new Date() ? subscription.currentPeriodEnd : now();
  await updateSubscription(agencyId, { status: 'activa', currentPeriodEnd: addDays(base, BILLING_PERIOD_DAYS) });
  return createPayment({ agencyId, subscriptionId: subscription.id, amount, currency, status: 'aprobado', method, mpPaymentId });
}

export async function createPayment({ agencyId, subscriptionId, amount, currency, status, method, mpPaymentId }) {
  const db = readDb();
  const payment = { id: uuid(), agencyId, subscriptionId: subscriptionId || null, amount: Number(amount) || 0, currency: currency || 'ARS', status: status || 'aprobado', method: method || 'simulado', mpPaymentId: mpPaymentId || null, createdAt: now() };
  db.payments.push(payment);
  writeDb(db);
  return clone(payment);
}

export async function listPaymentsByAgency(agencyId) {
  return clone(readDb().payments.filter(p => p.agencyId === agencyId).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
}

export async function listAgenciesWithSubscriptions() {
  const db = readDb();
  return clone(db.agencies.map(agency => ({ agency, subscription: db.subscriptions.find(s => s.agencyId === agency.id) || null })));
}

export async function createInvitation({ agencyId, role, note }) {
  const db = readDb();
  const invitation = { id: uuid(), agencyId, role: role === 'admin' ? 'admin' : 'agente', note: note || '', token: randomBytes(16).toString('hex'), status: 'pendiente', createdAt: now() };
  db.invitations.push(invitation);
  writeDb(db);
  return clone(invitation);
}

export async function getInvitationByToken(token) {
  return clone(readDb().invitations.find(i => i.token === token) || null);
}

export async function getInvitation(invitationId) {
  return clone(readDb().invitations.find(i => i.id === invitationId) || null);
}

export async function listPendingInvitationsByAgency(agencyId) {
  return clone(readDb().invitations.filter(i => i.agencyId === agencyId && i.status === 'pendiente'));
}

export async function cancelInvitation(invitationId) {
  const db = readDb();
  const invitation = db.invitations.find(i => i.id === invitationId);
  if (!invitation) return null;
  invitation.status = 'cancelada';
  writeDb(db);
  return clone(invitation);
}

export async function acceptInvitation(invitationId) {
  const db = readDb();
  const invitation = db.invitations.find(i => i.id === invitationId);
  if (!invitation) return null;
  invitation.status = 'aceptada';
  writeDb(db);
  return clone(invitation);
}

export async function createSupportTicket({ agencyId, userId, subject, message }) {
  const db = readDb();
  const ticket = { id: uuid(), agencyId, userId: userId || null, subject: subject || '', message: message || '', status: 'abierto', adminNote: '', createdAt: now(), respondedAt: null };
  db.supportTickets.push(ticket);
  writeDb(db);
  return clone(ticket);
}

export async function getSupportTicket(ticketId) {
  return clone(readDb().supportTickets.find(t => t.id === ticketId) || null);
}

export async function listSupportTicketsByAgency(agencyId) {
  return clone(readDb().supportTickets.filter(t => t.agencyId === agencyId).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))));
}

export async function listAllSupportTickets() {
  return clone(readDb().supportTickets.sort((a, b) => Number(a.status !== 'abierto') - Number(b.status !== 'abierto') || String(a.createdAt).localeCompare(String(b.createdAt))));
}

export async function countOpenSupportTickets() {
  return readDb().supportTickets.filter(t => t.status === 'abierto').length;
}

export async function resolveSupportTicket(ticketId, adminNote) {
  const db = readDb();
  const ticket = db.supportTickets.find(t => t.id === ticketId);
  if (!ticket) return null;
  ticket.status = 'resuelto';
  ticket.adminNote = adminNote || '';
  ticket.respondedAt = now();
  writeDb(db);
  return clone(ticket);
}

export async function reopenSupportTicket(ticketId) {
  const db = readDb();
  const ticket = db.supportTickets.find(t => t.id === ticketId);
  if (!ticket) return null;
  ticket.status = 'abierto';
  ticket.respondedAt = null;
  writeDb(db);
  return clone(ticket);
}
