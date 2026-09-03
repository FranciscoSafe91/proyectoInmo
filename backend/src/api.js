// api.js — rutas JSON para el frontend React (PostgreSQL only)

import { isMultipart, parseMultipartFormData } from './multipart.js';
import * as db from './db.js';
import * as auth from './auth.js';
import * as mercadopago from './mercadopago.js';
import pool from './pgPool.js';
import { randomUUID } from 'node:crypto';
import { writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
const LOGOS_DIR = join(PUBLIC_DIR, 'uploads', 'logos');
const LOGO_EXTENSIONS = {
  'image/png': '.png', 'image/jpeg': '.jpg',
  'image/webp': '.webp', 'image/svg+xml': '.svg',
};

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Credentials': 'true',
  });
  res.end(JSON.stringify(data));
}

function err(res, message, status = 400) {
  json(res, { error: message }, status);
}

async function rawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; if (data.length > 2_000_000) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function parseJson(req) {
  const body = await rawBody(req);
  try { return JSON.parse(body); } catch { return {}; }
}

function toArray(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function baseUrlFor(req) {
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return `${proto}://${req.headers.host}`;
}

function slugify(text) {
  return text.toString().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function requireSession(req, res) {
  const session = await auth.getCurrentUser(req);
  if (!session) { err(res, 'No autenticado', 401); return null; }
  return session;
}

async function requirePlatformAdmin(req, res) {
  const session = await auth.getCurrentUser(req);
  if (!session) { err(res, 'No autenticado', 401); return null; }
  if (!session.user.isPlatformAdmin) { err(res, 'No tenés acceso al panel de administración.', 403); return null; }
  return session;
}

function requireAccountAdmin(req, res, session) {
  if (session.user.role !== 'admin') {
    err(res, 'Solo un administrador de la cuenta puede acceder a esta sección.', 403);
    return false;
  }
  return true;
}

export function registerApiRoutes(router) {
  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------
  router.get('/api/session', async (req, res) => {
    const session = await auth.getCurrentUser(req);
    if (!session) return err(res, 'No autenticado', 401);
    json(res, { user: session.user, agency: session.agency });
  });

  router.post('/api/login', async (req, res) => {
    const body = await parseJson(req);
    const { email, password } = body;
    if (!email || !password) return err(res, 'Ingresá tu email y contraseña.', 400);

    const user = await db.findUserByEmail(email);
    if (!user || !auth.verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      return err(res, 'Email o contraseña incorrectos.', 401);
    }
    await auth.login(res, user.id);
    const agency = await db.getAgency(user.agencyId);
    json(res, { user, agency });
  });

  router.post('/api/registro', async (req, res) => {
    const body = await parseJson(req);
    const { nombre, apellido, documento, email, accountType, agencyName, direccion, username, password } = body;

    const fullName = `${(nombre || '').trim()} ${(apellido || '').trim()}`.trim();
    if (!fullName || !email || !agencyName || !username || !password) {
      return err(res, 'Completá todos los campos obligatorios.');
    }

    const existing = await db.findUserByEmail(email);
    if (existing) return err(res, 'Ya existe un usuario con ese email.');

    let slug = slugify(agencyName);
    if (await db.findAgencyBySlug(slug)) slug = `${slug}-${Math.floor(Math.random() * 10000)}`;

    const agency = await db.createAgency({
      name: agencyName, slug, email,
      city: direccion || '',
      accountType: accountType || 'inmobiliaria',
    });

    const { hash, salt } = auth.hashPassword(password);
    const user = await db.createUser({
      agencyId: agency.id,
      nombre: nombre || '', apellido: apellido || '',
      documento: documento || '', email,
      accountType: accountType || 'inmobiliaria',
      agencyName, direccion: direccion || '',
      username: username || '',
      passwordHash: hash, passwordSalt: salt, role: 'admin',
    });

    await auth.login(res, user.id);
    json(res, { user, agency }, 201);
  });

  router.post('/api/logout', async (req, res) => {
    await auth.logout(req, res);
    json(res, { ok: true });
  });

  router.post('/api/forgot-password', async (req, res) => {
    const body = await parseJson(req);
    const { email } = body;
    if (!email) return err(res, 'Ingresá un email.', 400);
    const user = await db.findUserByEmail(email);
    if (user) return json(res, { ok: true });
    return err(res, 'Email no registrado.', 404);
  });

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------
  router.get('/api/dashboard', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const { agency } = session;
    const stats = {
      myProperties:        (await db.listPropertiesByAgency(agency.id)).length,
      sharedWithMe:        (await db.listAcceptedSharesReceived(agency.id)).length,
      partners:            (await db.listPartnersOfAgency(agency.id)).length,
      pendingShares:       (await db.listPendingSharesReceived(agency.id)).length,
      pendingPartnerships: (await db.listPendingPartnershipRequestsReceived(agency.id)).length,
      alertMatches:        (await db.listAlertMatchesForOwner(agency.id)).length,
    };
    json(res, { agency, stats });
  });

  // ---------------------------------------------------------------------------
  // Propiedades
  // ---------------------------------------------------------------------------
  router.get('/api/propiedades', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const properties = await db.listPropertiesByUser(session.agency.id, session.user.id);
    const sharesByProperty = {};
    await Promise.all(properties.map(async p => {
      sharesByProperty[p.id] = await db.listSharesForProperty(p.id);
    }));
    json(res, { properties, sharesByProperty });
  });

  router.post('/api/propiedades', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const body = await parseJson(req);
    if (!body.title) return err(res, 'El título es obligatorio.');
    const property = await db.createProperty({ ...body, agencyId: session.agency.id, createdByUserId: session.user.id });
    json(res, { property }, 201);
  });

  router.get('/api/propiedades/:id', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const property = await db.getProperty(req.params.id);
    if (!property) return err(res, 'Propiedad no encontrada.', 404);

    const isCreator = property.agencyId === session.agency.id && property.createdByUserId === session.user.id;
    const owner = await db.getAgency(property.agencyId);

    if (!isCreator) {
      // Verificar si la propiedad le fue compartida (de otra agencia)
      if (property.agencyId !== session.agency.id) {
        const shares = await db.listSharesForProperty(property.id);
        const myShare = shares.find(s => s.targetAgencyId === session.agency.id && s.status === 'aceptada');
        if (!myShare) return err(res, 'No tenés acceso a esta propiedad.', 403);
        return json(res, { property, owner, shares: [], partnerAgencies: { list: [], byId: {} }, isOwner: false });
      }
      return err(res, 'No tenés acceso a esta propiedad.', 403);
    }

    const shares = await db.listSharesForProperty(property.id);
    const partnerIds = await db.listPartnersOfAgency(session.agency.id);
    const partnerAgenciesList = (await Promise.all(partnerIds.map(id => db.getAgency(id)))).filter(Boolean);
    const byId = Object.fromEntries(partnerAgenciesList.map(a => [a.id, a]));
    json(res, { property, owner, shares, partnerAgencies: { list: partnerAgenciesList, byId }, isOwner: true });
  });

  router.put('/api/propiedades/:id', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const property = await db.getProperty(req.params.id);
    if (!property || property.agencyId !== session.agency.id || property.createdByUserId !== session.user.id) {
      return err(res, 'Propiedad no encontrada.', 404);
    }
    const body = await parseJson(req);
    const updated = await db.updateProperty(property.id, body);
    json(res, { property: updated });
  });

  router.post('/api/propiedades/:id/compartir', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const property = await db.getProperty(req.params.id);
    if (!property || property.agencyId !== session.agency.id || property.createdByUserId !== session.user.id) {
      return err(res, 'Propiedad no encontrada.', 404);
    }
    const body = await parseJson(req);
    const targetIds = toArray(body.targetAgencyIds);
    const authorizeWeb = Boolean(body.allowWebPublish);
    await Promise.all(targetIds.map(async targetAgencyId => {
      if (await db.arePartners(session.agency.id, targetAgencyId)) {
        const share = await db.createPropertyShare({ propertyId: property.id, ownerAgencyId: session.agency.id, targetAgencyId });
        if (authorizeWeb) await db.setSharePublishAuthorization(share.id, true);
      }
    }));
    json(res, { ok: true });
  });

  router.post('/api/propiedades/:propertyId/compartir/:shareId/autorizar-web', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const property = await db.getProperty(req.params.propertyId);
    const share = await db.getPropertyShare(req.params.shareId);
    if (property && share && property.agencyId === session.agency.id && share.propertyId === property.id) {
      await db.setSharePublishAuthorization(share.id, true);
    }
    json(res, { ok: true });
  });

  router.post('/api/propiedades/:propertyId/compartir/:shareId/quitar-autorizacion-web', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const property = await db.getProperty(req.params.propertyId);
    const share = await db.getPropertyShare(req.params.shareId);
    if (property && share && property.agencyId === session.agency.id && share.propertyId === property.id) {
      await db.setSharePublishAuthorization(share.id, false);
    }
    json(res, { ok: true });
  });

  // ---------------------------------------------------------------------------
  // Compartidas conmigo
  // ---------------------------------------------------------------------------
  router.get('/api/compartidas', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const shares = await db.listAcceptedSharesReceived(session.agency.id);
    const items = (await Promise.all(shares.map(async s => {
      const property = await db.getProperty(s.propertyId);
      if (!property) return null;
      const ownerAgency = await db.getAgency(s.ownerAgencyId);
      return { property, ownerAgency, webPublishAuthorized: s.webPublishAuthorized };
    }))).filter(Boolean);
    json(res, { items });
  });

  // ---------------------------------------------------------------------------
  // Socios
  // ---------------------------------------------------------------------------
  router.get('/api/socios', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const { URL } = globalThis;
    const url = new URL(req.url, `http://${req.headers.host}`);
    const query = url.searchParams.get('q') || '';
    const results = await db.searchAgencies(query, session.agency.id);
    const partnerIds = await db.listPartnersOfAgency(session.agency.id);
    const sentPendingIds = (await db.listPendingPartnershipRequestsSent(session.agency.id)).map(p => p.agencyBId);
    const receivedPendingIds = (await db.listPendingPartnershipRequestsReceived(session.agency.id)).map(p => p.agencyAId);
    const currentPartners = (await Promise.all(partnerIds.map(id => db.getAgency(id)))).filter(Boolean);
    json(res, { query, results, partnerIds, sentPendingIds, receivedPendingIds, currentPartners });
  });

  router.post('/api/socios/:agencyId/solicitar', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const targetAgencyId = req.params.agencyId;
    const target = await db.getAgency(targetAgencyId);
    if (target && targetAgencyId !== session.agency.id && !await db.findPartnership(session.agency.id, targetAgencyId)) {
      await db.createPartnershipRequest({ fromAgencyId: session.agency.id, toAgencyId: targetAgencyId });
    }
    json(res, { ok: true });
  });

  router.post('/api/socios/solicitud/:partnershipId/aceptar', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const partnership = await db.getPartnership(req.params.partnershipId);
    if (partnership && partnership.agencyBId === session.agency.id && partnership.status === 'pendiente') {
      await db.respondPartnership(partnership.id, 'aceptada');
    }
    json(res, { ok: true });
  });

  router.post('/api/socios/solicitud/:partnershipId/rechazar', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const partnership = await db.getPartnership(req.params.partnershipId);
    if (partnership && partnership.agencyBId === session.agency.id && partnership.status === 'pendiente') {
      await db.respondPartnership(partnership.id, 'rechazada');
    }
    json(res, { ok: true });
  });

  // ---------------------------------------------------------------------------
  // Invitaciones
  // ---------------------------------------------------------------------------
  router.get('/api/invitaciones', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const pendingShares = (await Promise.all(
      (await db.listPendingSharesReceived(session.agency.id)).map(async share => {
        const property = await db.getProperty(share.propertyId);
        if (!property) return null;
        const ownerAgency = await db.getAgency(share.ownerAgencyId);
        return { share, property, ownerAgency };
      })
    )).filter(Boolean);
    const pendingPartnerships = await Promise.all(
      (await db.listPendingPartnershipRequestsReceived(session.agency.id))
        .map(async partnership => ({ partnership, fromAgency: await db.getAgency(partnership.agencyAId) }))
    );
    json(res, { pendingShares, pendingPartnerships });
  });

  router.post('/api/invitaciones/compartir/:shareId/aceptar', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const share = await db.getPropertyShare(req.params.shareId);
    if (share && share.targetAgencyId === session.agency.id && share.status === 'pendiente') {
      await db.respondPropertyShare(share.id, 'aceptada');
    }
    json(res, { ok: true });
  });

  router.post('/api/invitaciones/compartir/:shareId/rechazar', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const share = await db.getPropertyShare(req.params.shareId);
    if (share && share.targetAgencyId === session.agency.id && share.status === 'pendiente') {
      await db.respondPropertyShare(share.id, 'rechazada');
    }
    json(res, { ok: true });
  });

  // ---------------------------------------------------------------------------
  // Alertas
  // ---------------------------------------------------------------------------
  router.get('/api/alertas', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const alerts = await db.listAlertsByAgency(session.agency.id);
    const rawMatches = await db.listAlertMatchesForOwner(session.agency.id);
    const matches = (await Promise.all(
      rawMatches.map(async m => ({ ...m, requestingAgency: await db.getAgency(m.requestingAgencyId) }))
    )).filter(m => m.requestingAgency);
    const hasPartners = (await db.listPartnersOfAgency(session.agency.id)).length > 0;
    json(res, { alerts, matches, hasPartners });
  });

  router.post('/api/alertas', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const body = await parseJson(req);
    const alert = await db.createSearchAlert({ ...body, agencyId: session.agency.id });
    json(res, { alert }, 201);
  });

  router.post('/api/alertas/:id/pausar', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const alert = await db.getSearchAlert(req.params.id);
    if (alert && alert.agencyId === session.agency.id) await db.setSearchAlertActive(alert.id, false);
    json(res, { ok: true });
  });

  router.post('/api/alertas/:id/activar', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const alert = await db.getSearchAlert(req.params.id);
    if (alert && alert.agencyId === session.agency.id) await db.setSearchAlertActive(alert.id, true);
    json(res, { ok: true });
  });

  router.delete('/api/alertas/:id', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const alert = await db.getSearchAlert(req.params.id);
    if (alert && alert.agencyId === session.agency.id) await db.deleteSearchAlert(alert.id);
    json(res, { ok: true });
  });

  router.post('/api/alertas/:alertId/compartir/:propertyId', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const alert = await db.getSearchAlert(req.params.alertId);
    const property = await db.getProperty(req.params.propertyId);
    if (alert && property && property.agencyId === session.agency.id && await db.arePartners(session.agency.id, alert.agencyId)) {
      const share = await db.createPropertyShare({ propertyId: property.id, ownerAgencyId: session.agency.id, targetAgencyId: alert.agencyId });
      await db.respondPropertyShare(share.id, 'aceptada');
    }
    json(res, { ok: true });
  });

  // ---------------------------------------------------------------------------
  // Mi web
  // ---------------------------------------------------------------------------
  router.get('/api/mi-web', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const backendUrl = baseUrlFor(req);
    const feedUrl = `${backendUrl}/api/v1/feed/${session.agency.id}?key=${session.agency.apiKey}`;
    const widgetSrc = `${backendUrl}/widget.js?agency=${session.agency.id}&key=${session.agency.apiKey}`;
    const embedCode = `<div id="propiedades-compartidas"></div>\n<script src="${widgetSrc}" async></script>`;
    json(res, { agency: session.agency, feedUrl, widgetSrc, embedCode });
  });

  router.post('/api/mi-web/regenerar-clave', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    await db.regenerateApiKey(session.agency.id);
    json(res, { ok: true });
  });

  // ---------------------------------------------------------------------------
  // Configuración
  // ---------------------------------------------------------------------------
  router.get('/api/configuracion', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const subscription = await db.getSubscriptionByAgency(session.agency.id);
    json(res, {
      agency: session.agency,
      subscriptionStatus: db.effectiveSubscriptionStatus(subscription),
      teamSize: (await db.listUsersByAgency(session.agency.id)).length,
      isPlatformAdmin: session.user.isPlatformAdmin,
    });
  });

  // ---------------------------------------------------------------------------
  // Mi cuenta
  // ---------------------------------------------------------------------------
  router.get('/api/mi-cuenta', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    json(res, { agency: session.agency });
  });

  router.put('/api/mi-cuenta', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const body = await parseJson(req);
    const agency = await db.updateAgency(session.agency.id, {
      phone: body.phone || '',
      city: body.city || '',
      brandColor: /^#[0-9a-fA-F]{6}$/.test(body.brandColor || '') ? body.brandColor : session.agency.brandColor,
    });
    json(res, { agency });
  });

  router.post('/api/mi-cuenta/logo', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    if (!isMultipart(req)) return err(res, 'Solicitud inválida.');
    let parsed;
    try { parsed = await parseMultipartFormData(req, { maxBytes: 8 * 1024 * 1024 }); } catch { return err(res, 'Error al procesar el archivo.'); }
    const file = parsed.files.logo;
    const ext = file && LOGO_EXTENSIONS[file.contentType];
    if (!file || !ext) return err(res, 'Formato de imagen inválido.');
    const previous = session.agency.logoPath;
    const filename = `${session.agency.id}-${randomUUID()}${ext}`;
    writeFileSync(join(LOGOS_DIR, filename), file.buffer);
    const agency = await db.updateAgency(session.agency.id, { logoPath: `/uploads/logos/${filename}` });
    if (previous) {
      const prev = join(PUBLIC_DIR, previous);
      if (prev.startsWith(LOGOS_DIR) && existsSync(prev)) { try { unlinkSync(prev); } catch {} }
    }
    json(res, { agency });
  });

  router.post('/api/mi-cuenta/logo/quitar', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const previous = session.agency.logoPath;
    const agency = await db.updateAgency(session.agency.id, { logoPath: null });
    if (previous) {
      const prev = join(PUBLIC_DIR, previous);
      if (prev.startsWith(LOGOS_DIR) && existsSync(prev)) { try { unlinkSync(prev); } catch {} }
    }
    json(res, { agency });
  });

  // ---------------------------------------------------------------------------
  // Equipo
  // ---------------------------------------------------------------------------
  router.get('/api/equipo', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    if (!requireAccountAdmin(req, res, session)) return;
    json(res, {
      currentUser: session.user,
      users: await db.listUsersByAgency(session.agency.id),
      pendingInvitations: await db.listPendingInvitationsByAgency(session.agency.id),
      baseUrl: baseUrlFor(req).replace(':3001', ':5173'),
    });
  });

  router.post('/api/equipo/invitar', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    if (!requireAccountAdmin(req, res, session)) return;
    const body = await parseJson(req);
    const invitation = await db.createInvitation({ agencyId: session.agency.id, role: body.role, note: body.note });
    json(res, { invitation }, 201);
  });

  router.post('/api/equipo/invitaciones/:id/cancelar', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    if (!requireAccountAdmin(req, res, session)) return;
    const invitation = await db.getInvitation(req.params.id);
    if (invitation && invitation.agencyId === session.agency.id) await db.cancelInvitation(invitation.id);
    json(res, { ok: true });
  });

  router.put('/api/equipo/usuarios/:id/rol', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    if (!requireAccountAdmin(req, res, session)) return;
    const target = await db.getUser(req.params.id);
    const body = await parseJson(req);
    if (target && target.agencyId === session.agency.id && target.id !== session.user.id) {
      if (!(target.role === 'admin' && body.role !== 'admin' && await db.countAdminsInAgency(session.agency.id) <= 1)) {
        await db.updateUserRole(target.id, body.role);
      }
    }
    json(res, { ok: true });
  });

  router.delete('/api/equipo/usuarios/:id', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    if (!requireAccountAdmin(req, res, session)) return;
    const target = await db.getUser(req.params.id);
    if (target && target.agencyId === session.agency.id && target.id !== session.user.id) {
      if (!(target.role === 'admin' && await db.countAdminsInAgency(session.agency.id) <= 1)) {
        await db.deleteUser(target.id);
      }
    }
    json(res, { ok: true });
  });

  // ---------------------------------------------------------------------------
  // Suscripción
  // ---------------------------------------------------------------------------
  router.get('/api/suscripcion', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    if (!requireAccountAdmin(req, res, session)) return;
    const subscription = await db.getSubscriptionByAgency(session.agency.id);
    json(res, {
      plan: await db.getPlan(),
      subscription,
      status: db.effectiveSubscriptionStatus(subscription),
      payments: await db.listPaymentsByAgency(session.agency.id),
      mpConfigured: mercadopago.isConfigured(),
    });
  });

  router.post('/api/suscripcion/pagar', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    if (!requireAccountAdmin(req, res, session)) return;
    const plan = await db.getPlan();
    if (mercadopago.isConfigured()) {
      try {
        const preapproval = await mercadopago.createPreapproval({
          reason: plan.name, payerEmail: session.agency.email, amount: plan.priceARS,
          externalReference: session.agency.id,
          backUrl: `${baseUrlFor(req).replace(':3001', ':5173')}/suscripcion`,
        });
        await db.updateSubscription(session.agency.id, { mpPreapprovalId: preapproval.id });
        return json(res, { ok: true, redirectUrl: preapproval.init_point });
      } catch {
        return err(res, 'Error al crear la suscripción en Mercado Pago.');
      }
    }
    await db.applySuccessfulPayment(session.agency.id, { amount: plan.priceARS, currency: 'ARS', method: 'simulado' });
    json(res, { ok: true });
  });

  // ---------------------------------------------------------------------------
  // Soporte
  // ---------------------------------------------------------------------------
  router.get('/api/soporte', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    json(res, { tickets: await db.listSupportTicketsByAgency(session.agency.id), contactEmail: 'info@safeinmuebles.com' });
  });

  router.post('/api/soporte', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const body = await parseJson(req);
    if (!body.subject || !body.message) return err(res, 'Completá el asunto y el mensaje.');
    const ticket = await db.createSupportTicket({ agencyId: session.agency.id, userId: session.user.id, subject: body.subject, message: body.message });
    json(res, { ticket }, 201);
  });

  // ---------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------
  router.get('/api/admin', async (req, res) => {
    const session = await requirePlatformAdmin(req, res);
    if (!session) return;
    const rows = (await db.listAgenciesWithSubscriptions()).map(({ agency, subscription }) => ({
      agency, subscription, status: db.effectiveSubscriptionStatus(subscription),
    }));
    json(res, { rows, plan: await db.getPlan(), openTicketsCount: await db.countOpenSupportTickets() });
  });

  router.get('/api/admin/soporte', async (req, res) => {
    const session = await requirePlatformAdmin(req, res);
    if (!session) return;
    const tickets = await Promise.all(
      (await db.listAllSupportTickets()).map(async ticket => ({
        ticket,
        agency: await db.getAgency(ticket.agencyId),
        user: await db.getUser(ticket.userId),
      }))
    );
    json(res, { tickets });
  });

  router.post('/api/admin/soporte/:id/resolver', async (req, res) => {
    const session = await requirePlatformAdmin(req, res);
    if (!session) return;
    const body = await parseJson(req);
    if (await db.getSupportTicket(req.params.id)) await db.resolveSupportTicket(req.params.id, body.adminNote || '');
    json(res, { ok: true });
  });

  router.post('/api/admin/soporte/:id/reabrir', async (req, res) => {
    const session = await requirePlatformAdmin(req, res);
    if (!session) return;
    if (await db.getSupportTicket(req.params.id)) await db.reopenSupportTicket(req.params.id);
    json(res, { ok: true });
  });

  router.get('/api/admin/inmobiliarias/:id', async (req, res) => {
    const session = await requirePlatformAdmin(req, res);
    if (!session) return;
    const agency = await db.getAgency(req.params.id);
    if (!agency) return err(res, 'Inmobiliaria no encontrada.', 404);
    const subscription = await db.getSubscriptionByAgency(agency.id);
    json(res, {
      agency, subscription, status: db.effectiveSubscriptionStatus(subscription),
      users: await db.listUsersByAgency(agency.id),
      payments: await db.listPaymentsByAgency(agency.id),
    });
  });

  router.post('/api/admin/inmobiliarias/:id/marcar-pagado', async (req, res) => {
    const session = await requirePlatformAdmin(req, res);
    if (!session) return;
    const agency = await db.getAgency(req.params.id);
    if (agency) {
      const plan = await db.getPlan();
      await db.applySuccessfulPayment(agency.id, { amount: plan.priceARS, currency: 'ARS', method: 'manual' });
    }
    json(res, { ok: true });
  });

  router.get('/api/admin/plan', async (req, res) => {
    const session = await requirePlatformAdmin(req, res);
    if (!session) return;
    json(res, { plan: await db.getPlan() });
  });

  router.put('/api/admin/plan', async (req, res) => {
    const session = await requirePlatformAdmin(req, res);
    if (!session) return;
    const body = await parseJson(req);
    if (body.name && body.priceARS) await db.updatePlan({ name: body.name, priceARS: Number(body.priceARS) || 0 });
    json(res, { plan: await db.getPlan() });
  });

  // ---------------------------------------------------------------------------
  // Propiedad pública (sin auth)
  // ---------------------------------------------------------------------------
  router.get('/api/public/propiedades/:id', async (req, res) => {
    const property = await db.getProperty(req.params.id);
    if (!property || property.status !== 'publicada') return err(res, 'Propiedad no disponible.', 404);
    const owner = await db.getAgency(property.agencyId);
    const { URL } = globalThis;
    const url = new URL(req.url, `http://${req.headers.host}`);
    const viaAgencyId = url.searchParams.get('via');
    let viaAgency = owner;
    if (viaAgencyId && viaAgencyId !== owner.id) {
      const candidate = await db.getAgency(viaAgencyId);
      const share = candidate && await db.getShareForPropertyAndTarget(property.id, viaAgencyId);
      if (candidate && share && share.status === 'aceptada' && share.webPublishAuthorized) viaAgency = candidate;
    }
    json(res, { property, owner, viaAgency });
  });

  // ---------------------------------------------------------------------------
  // Unirse por token
  // ---------------------------------------------------------------------------
  router.get('/api/unirse/:token', async (req, res) => {
    const invitation = await db.getInvitationByToken(req.params.token);
    if (!invitation || invitation.status !== 'pendiente') return err(res, 'Este link de invitación no es válido, ya fue usado o fue cancelado.', 410);
    const agency = await db.getAgency(invitation.agencyId);
    json(res, { agency, invitation });
  });

  router.post('/api/unirse/:token', async (req, res) => {
    const invitation = await db.getInvitationByToken(req.params.token);
    if (!invitation || invitation.status !== 'pendiente') return err(res, 'Este link de invitación no es válido, ya fue usado o fue cancelado.', 410);
    const agency = await db.getAgency(invitation.agencyId);
    const body = await parseJson(req);
    const { name, email, password } = body;
    if (!name || !email || !password || password.length < 6) return err(res, 'Completá tu nombre, email y una contraseña de al menos 6 caracteres.');
    if (await db.findUserByEmail(email)) return err(res, 'Ya existe un usuario con ese email.');
    const { hash, salt } = auth.hashPassword(password);
    const user = await db.createUser({ agencyId: agency.id, nombre: name, email, passwordHash: hash, passwordSalt: salt, role: invitation.role });
    await db.acceptInvitation(invitation.id);
    await auth.login(res, user.id);
    json(res, { user, agency }, 201);
  });
}
