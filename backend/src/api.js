// api.js — rutas JSON para el frontend React (PostgreSQL only)

import { isMultipart, parseMultipartFormData } from './multipart.js';
import * as db from './db.js';
import * as auth from './auth.js';
import * as mercadopago from './mercadopago.js';
import pool from './pgPool.js';
import { randomUUID } from 'node:crypto';
import * as mail from './mail.js';
import { uploadBuffer, deleteResource, signUpload, uploadStreamToCloudinary } from './cloudinary.js';

const LOGO_CONTENT_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const PROPERTY_MEDIA_CONTENT_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
]);

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

async function parsePropertyRequest(req) {
  if (!isMultipart(req)) return { fields: await parseJson(req), files: [] };
  const parsed = await parseMultipartFormData(req, { maxBytes: 80 * 1024 * 1024 });
  return { fields: parsed.fields, files: Object.values(parsed.files || {}) };
}

async function savePropertyMedia(propertyId, files) {
  const accepted = files
    .filter(file => file && PROPERTY_MEDIA_CONTENT_TYPES.has(file.contentType));

  const created = [];
  for (const [index, file] of accepted.entries()) {
    const mediaType = file.contentType.startsWith('video/') ? 'video' : 'image';
    const publicId = `spyderconnect/properties/${propertyId}/${randomUUID()}`;
    const result = await uploadBuffer(file.buffer, { public_id: publicId, resource_type: mediaType });
    created.push(await db.createPropertyMedia({
      propertyId,
      url: result.secure_url,
      type: mediaType,
      filename: file.filename || publicId,
      sortOrder: index,
    }));
  }
  return created;
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

async function notifyAlertMatches(property, ownerAgency) {
  if (!mail.isConfigured()) return;
  try {
    const matches = await db.findMatchingAlertsForProperty(property, ownerAgency.id);
    for (const { alert, requestingAgencyId } of matches) {
      const requestingAgency = await db.getAgency(requestingAgencyId);
      if (!requestingAgency) continue;
      mail.sendAlertMatch(requestingAgency.email, {
        partnerAgencyName: ownerAgency.name,
        propertyTitle: property.title,
        alertTitle: alert.title,
        mudanzaInmediata: alert.mudanzaInmediata,
      }).catch(() => {});
    }
  } catch {}
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
    if (mail.isConfigured()) {
      mail.sendWelcome(email, `${nombre} ${apellido}`.trim()).catch(() => {});
    }
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
    if (user && mail.isConfigured()) {
      const token = await db.createPasswordResetToken(user.id);
      const frontendBase = process.env.CORS_ORIGIN || baseUrlFor(req);
      const resetUrl = `${frontendBase}/reset-password?token=${token}`;
      mail.sendPasswordReset(user.email, resetUrl).catch(() => {});
    }
    // Siempre responder ok para no revelar si el email existe
    return json(res, { ok: true });
  });

  router.post('/api/reset-password', async (req, res) => {
    const body = await parseJson(req);
    const { token, password } = body;
    if (!token || !password || password.length < 6) {
      return err(res, 'La contraseña debe tener al menos 6 caracteres.', 400);
    }
    const resetToken = await db.getPasswordResetToken(token);
    if (!resetToken) return err(res, 'El enlace expiró o ya fue usado.', 400);
    const { hash, salt } = auth.hashPassword(password);
    await db.updateUserPassword(resetToken.userId, hash, salt);
    await db.deletePasswordResetToken(token);
    return json(res, { ok: true });
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
      sharedWithMe:        (await db.listAcceptedDirectSharesReceived(agency.id)).length,
      partners:            (await db.listPartnersOfAgency(agency.id)).length,
      pendingShares:       (await db.listPendingSharesReceived(agency.id)).length,
      pendingPartnerships: (await db.listPendingPartnershipRequestsReceived(agency.id)).length,
      alertMatches:        (await db.listAlertMatchesForOwner(agency.id)).length,
      myAlertMatchCount:   (await db.listAlertsWithMatchCounts(agency.id)).reduce((s, a) => s + a.matchCount, 0),
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
    const coverMediaByProperty = {};
    await Promise.all(properties.map(async p => {
      sharesByProperty[p.id] = await db.listSharesForProperty(p.id);
      coverMediaByProperty[p.id] = (await db.listPropertyMedia(p.id))[0] || null;
    }));
    json(res, { properties, sharesByProperty, coverMediaByProperty });
  });

  router.post('/api/propiedades', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    let body;
    let files = [];
    try {
      const parsed = await parsePropertyRequest(req);
      body = parsed.fields;
      files = parsed.files;
    } catch {
      return err(res, 'Error al procesar los archivos.');
    }
    if (!body.title) return err(res, 'El título es obligatorio.');
    const property = await db.createProperty({ ...body, agencyId: session.agency.id, createdByUserId: session.user.id });
    const media = await savePropertyMedia(property.id, files);
    notifyAlertMatches(property, session.agency).catch(() => {});
    db.syncMatchRequestsForProperty(property).catch(() => {});
    json(res, { property, media }, 201);
  });

  router.get('/api/propiedades/:id', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const property = await db.getProperty(req.params.id);
    if (!property) return err(res, 'Propiedad no encontrada.', 404);

    const isCreator = property.agencyId === session.agency.id && property.createdByUserId === session.user.id;
    const owner = await db.getAgency(property.agencyId);
    const media = await db.listPropertyMedia(property.id);

    if (!isCreator) {
      if (property.agencyId !== session.agency.id) {
        const shares = await db.listSharesForProperty(property.id);
        const myShare = shares.find(s => s.targetAgencyId === session.agency.id && s.status === 'aceptada');
        if (myShare) return json(res, { property, media, owner, shares: [], partnerAgencies: { list: [], byId: {} }, isOwner: false });
        // Cualquier usuario logueado puede ver propiedades publicadas (solo lectura)
        if (property.status === 'publicada') return json(res, { property, media, owner, shares: [], partnerAgencies: { list: [], byId: {} }, isOwner: false });
        return err(res, 'No tenés acceso a esta propiedad.', 403);
      }
      return err(res, 'No tenés acceso a esta propiedad.', 403);
    }

    const shares = await db.listSharesForProperty(property.id);
    const partnerIds = await db.listPartnersOfAgency(session.agency.id);
    const partnerAgenciesList = (await Promise.all(partnerIds.map(id => db.getAgency(id)))).filter(Boolean);
    const byId = Object.fromEntries(partnerAgenciesList.map(a => [a.id, a]));
    json(res, { property, media, owner, shares, partnerAgencies: { list: partnerAgenciesList, byId }, isOwner: true });
  });

  router.put('/api/propiedades/:id', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const property = await db.getProperty(req.params.id);
    if (!property || property.agencyId !== session.agency.id || property.createdByUserId !== session.user.id) {
      return err(res, 'Propiedad no encontrada.', 404);
    }
    let body;
    let files = [];
    try {
      const parsed = await parsePropertyRequest(req);
      body = parsed.fields;
      files = parsed.files;
    } catch {
      return err(res, 'Error al procesar los archivos.');
    }
    const updated = await db.updateProperty(property.id, body);
    const media = files.length
      ? await savePropertyMedia(property.id, files)
      : await db.listPropertyMedia(property.id);
    notifyAlertMatches(updated, session.agency).catch(() => {});
    db.syncMatchRequestsForProperty(updated).catch(() => {});
    json(res, { property: updated, media });
  });

  router.delete('/api/propiedades/:id', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const property = await db.getProperty(req.params.id);
    if (!property || property.agencyId !== session.agency.id || property.createdByUserId !== session.user.id) {
      return err(res, 'Propiedad no encontrada.', 404);
    }
    await db.deleteProperty(property.id);
    json(res, { ok: true });
  });

  // Subida de video al backend → backend sube a Cloudinary (evita CORS y límite de tamaño del browser)
  router.post('/api/upload/video', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const MAX_BYTES = 200 * 1024 * 1024; // 200 MB
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > MAX_BYTES) {
      return err(res, 'El video no puede superar los 200 MB.');
    }
    const publicId = `spyderconnect/properties/${randomUUID()}`;
    const { stream, promise } = uploadStreamToCloudinary({ resource_type: 'video', public_id: publicId });
    let received = 0;
    req.on('data', chunk => {
      received += chunk.length;
      if (received > MAX_BYTES) {
        req.destroy();
        return err(res, 'El video no puede superar los 200 MB.');
      }
    });
    req.pipe(stream);
    try {
      const result = await promise;
      json(res, { secure_url: result.secure_url, public_id: result.public_id });
    } catch (e) {
      console.error('Error subiendo video a Cloudinary:', e);
      if (!res.headersSent) err(res, 'Error al subir el video. Intentá de nuevo.');
    }
  });

  // Firma para subida directa de video desde el browser a Cloudinary (legacy, mantenido por compatibilidad)
  router.get('/api/cloudinary/sign', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const timestamp = Math.round(Date.now() / 1000);
    const publicId = `spyderconnect/properties/${randomUUID()}`;
    const signature = signUpload({ timestamp, public_id: publicId });
    json(res, {
      signature,
      timestamp,
      publicId,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    });
  });

  // Registra una URL de video ya subida directamente a Cloudinary
  router.post('/api/propiedades/:id/media-url', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const property = await db.getProperty(req.params.id);
    if (!property || property.agencyId !== session.agency.id) return err(res, 'No encontrada.', 404);
    const body = await parseJson(req);
    if (!body.url || !body.type) return err(res, 'url y type son requeridos.', 400);
    const media = await db.createPropertyMedia({
      propertyId: req.params.id,
      url: body.url,
      type: body.type,
      filename: body.filename || '',
      sortOrder: body.sortOrder ?? 0,
    });
    json(res, { media }, 201);
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
    const percentages = body.percentages || {};
    await Promise.all(targetIds.map(async targetAgencyId => {
      if (await db.arePartners(session.agency.id, targetAgencyId)) {
        const percentage = percentages[targetAgencyId] ?? null;
        const share = await db.createPropertyShare({ propertyId: property.id, ownerAgencyId: session.agency.id, targetAgencyId, percentage });
        if (authorizeWeb) await db.setSharePublishAuthorization(share.id, true);
      }
    }));
    json(res, { ok: true });
  });

  router.delete('/api/propiedades/:propertyId/compartir/:shareId', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const property = await db.getProperty(req.params.propertyId);
    const share = await db.getPropertyShare(req.params.shareId);
    if (property && share && property.agencyId === session.agency.id && share.propertyId === property.id) {
      await db.cancelShare(share.id);
      await db.cancelMatchRequestsForPropertyAndTarget(share.propertyId, share.targetAgencyId);
    }
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
    const shares = await db.listAcceptedDirectSharesReceived(session.agency.id);
    const items = (await Promise.all(shares.map(async s => {
      const property = await db.getProperty(s.propertyId);
      if (!property) return null;
      const ownerAgency = await db.getAgency(s.ownerAgencyId);
      const cover = (await db.listPropertyMedia(s.propertyId)).find(m => m.type === 'image') || null;
      return { property, ownerAgency, webPublishAuthorized: s.webPublishAuthorized, cover };
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
    const currentPartners = (await Promise.all(partnerIds.map(async id => {
      const agency = await db.getAgency(id);
      if (!agency) return null;
      const partnership = await db.findPartnership(session.agency.id, id);
      return { ...agency, partnershipId: partnership?.id || null };
    }))).filter(Boolean);
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
      // Notificar coincidencias entre ambas agencias ahora que son socias
      const agencyA = await db.getAgency(partnership.agencyAId);
      const agencyB = session.agency;
      if (agencyA) {
        const propsA = await db.listPropertiesByAgency(agencyA.id);
        for (const p of propsA) notifyAlertMatches(p, agencyA).catch(() => {});
        const propsB = await db.listPropertiesByAgency(agencyB.id);
        for (const p of propsB) notifyAlertMatches(p, agencyB).catch(() => {});
      }
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

  router.delete('/api/socios/:partnershipId', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const partnership = await db.getPartnership(req.params.partnershipId);
    if (!partnership || partnership.status !== 'aceptada') return err(res, 'Sociedad no encontrada.', 404);
    const belongs = partnership.agencyAId === session.agency.id || partnership.agencyBId === session.agency.id;
    if (!belongs) return err(res, 'No tenés permiso para disolver esta sociedad.', 403);
    await db.dissolvePartnership(partnership.id);
    json(res, { ok: true });
  });

  // ---------------------------------------------------------------------------
  // Grupos de socios
  // ---------------------------------------------------------------------------
  router.get('/api/grupos-socios', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const grupos = await db.listGruposSocios(session.agency.id);
    json(res, { grupos });
  });

  router.post('/api/grupos-socios', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const body = await parseJson(req);
    const name = (body.name || '').trim();
    if (!name) return err(res, 'El nombre del grupo es requerido.', 400);
    const grupo = await db.createGrupoSocios({ agencyId: session.agency.id, name });
    json(res, { grupo });
  });

  router.put('/api/grupos-socios/:id', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const grupo = await db.getGrupoSocios(req.params.id);
    if (!grupo || grupo.agencyId !== session.agency.id) return err(res, 'Grupo no encontrado.', 404);
    const body = await parseJson(req);
    const name = (body.name || '').trim();
    if (!name) return err(res, 'El nombre del grupo es requerido.', 400);
    const updated = await db.updateGrupoSocios(grupo.id, name);
    json(res, { grupo: updated });
  });

  router.delete('/api/grupos-socios/:id', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const grupo = await db.getGrupoSocios(req.params.id);
    if (!grupo || grupo.agencyId !== session.agency.id) return err(res, 'Grupo no encontrado.', 404);
    await db.deleteGrupoSocios(grupo.id);
    json(res, { ok: true });
  });

  router.post('/api/grupos-socios/:id/miembros', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const grupo = await db.getGrupoSocios(req.params.id);
    if (!grupo || grupo.agencyId !== session.agency.id) return err(res, 'Grupo no encontrado.', 404);
    const body = await parseJson(req);
    const partnerId = body.partnerId;
    if (!partnerId) return err(res, 'partnerId requerido.', 400);
    const partnerIds = await db.listPartnersOfAgency(session.agency.id);
    if (!partnerIds.includes(partnerId)) return err(res, 'Ese agente no es tu socio.', 400);
    await db.addMemberToGrupo(grupo.id, partnerId);
    json(res, { ok: true });
  });

  router.delete('/api/grupos-socios/:id/miembros/:partnerId', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const grupo = await db.getGrupoSocios(req.params.id);
    if (!grupo || grupo.agencyId !== session.agency.id) return err(res, 'Grupo no encontrado.', 404);
    await db.removeMemberFromGrupo(grupo.id, req.params.partnerId);
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
      const body = await parseJson(req);
      await db.respondPropertyShare(share.id, 'rechazada', body.reason || '');
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
    db.syncMatchRequestsForAlert(alert.id, session.agency.id).catch(() => {});
    json(res, { alert }, 201);
  });

  // ---------------------------------------------------------------------------
  // Matcheadas
  // ---------------------------------------------------------------------------
  router.get('/api/matcheadas', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const alerts = await db.listAlertsWithMatchCounts(session.agency.id);
    json(res, { alerts });
  });

  router.get('/api/matcheadas/:alertId', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const alert = await db.getSearchAlert(req.params.alertId);
    if (!alert || alert.agencyId !== session.agency.id) return json(res, { alert: null, properties: [] });
    const raw = await db.findMatchingPropertiesForAlert(req.params.alertId, session.agency.id);
    const properties = (await Promise.all(
      raw.map(async ({ property, ownerAgencyId }) => ({
        property,
        ownerAgency: await db.getAgency(ownerAgencyId),
      }))
    )).filter(e => e.ownerAgency);
    json(res, { alert, properties });
  });

  router.get('/api/match-requests', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const pending = await db.listPendingMatchRequestsForOwner(session.agency.id);
    const items = await Promise.all(pending.map(async mr => {
      const property = await db.getProperty(mr.propertyId);
      const alert = await db.getSearchAlert(mr.alertId);
      const alertAgency = await db.getAgency(mr.alertAgencyId);
      return { matchRequest: mr, property, alert, alertAgency };
    }));
    json(res, { items: items.filter(i => i.property && i.alert && i.alertAgency) });
  });

  router.post('/api/match-requests/:id/aceptar', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const mr = await db.getMatchRequest(req.params.id);
    if (!mr || mr.ownerAgencyId !== session.agency.id) return err(res, 'No autorizado', 403);
    await db.respondMatchRequest(mr.id, 'aceptado');
    json(res, { ok: true });
  });

  router.post('/api/match-requests/:id/rechazar', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const mr = await db.getMatchRequest(req.params.id);
    if (!mr || mr.ownerAgencyId !== session.agency.id) return err(res, 'No autorizado', 403);
    await db.respondMatchRequest(mr.id, 'rechazado');
    json(res, { ok: true });
  });

  router.get('/api/match-accepted/pending', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const pending = await db.listPendingAlerteeMatchRequests(session.agency.id);
    const items = await Promise.all(pending.map(async mr => {
      const property = await db.getProperty(mr.propertyId);
      const ownerAgency = await db.getAgency(mr.ownerAgencyId);
      const alert = await db.getSearchAlert(mr.alertId);
      return { matchRequest: mr, property, ownerAgency, alert };
    }));
    json(res, { items: items.filter(i => i.property && i.ownerAgency && i.alert) });
  });

  router.post('/api/match-accepted/:id/aceptar', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const mr = await db.getMatchRequest(req.params.id);
    if (!mr || mr.alertAgencyId !== session.agency.id) return err(res, 'No autorizado', 403);
    await db.respondAlerteeMatchRequest(mr.id, 'aceptado');
    json(res, { ok: true });
  });

  router.post('/api/match-accepted/:id/rechazar', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const mr = await db.getMatchRequest(req.params.id);
    if (!mr || mr.alertAgencyId !== session.agency.id) return err(res, 'No autorizado', 403);
    await db.respondAlerteeMatchRequest(mr.id, 'rechazado');
    json(res, { ok: true });
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
      const share = await db.createPropertyShare({ propertyId: property.id, ownerAgencyId: session.agency.id, targetAgencyId: alert.agencyId, source: 'match' });
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
      isAccountAdmin: session.user.role === 'admin',
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
    if (!file || !LOGO_CONTENT_TYPES.has(file.contentType)) return err(res, 'Formato de imagen inválido.');
    const result = await uploadBuffer(file.buffer, {
      public_id: `spyderconnect/logos/${session.agency.id}`,
      overwrite: true,
      resource_type: 'image',
    });
    const agency = await db.updateAgency(session.agency.id, { logoPath: result.secure_url });
    json(res, { agency });
  });

  router.post('/api/mi-cuenta/logo/quitar', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    await deleteResource(`spyderconnect/logos/${session.agency.id}`);
    const agency = await db.updateAgency(session.agency.id, { logoPath: null });
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
      baseUrl: CORS_ORIGIN,
    });
  });

  router.post('/api/equipo/invitar', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    if (!requireAccountAdmin(req, res, session)) return;
    const body = await parseJson(req);
    let menuPermisos = null;
    if (body.menuPermisos) {
      if (typeof body.menuPermisos === 'object' && !Array.isArray(body.menuPermisos)) {
        menuPermisos = body.menuPermisos; // nuevo: { secciones, acciones }
      } else if (Array.isArray(body.menuPermisos) && body.menuPermisos.length) {
        menuPermisos = body.menuPermisos; // viejo: array plano
      }
    }
    const invitation = await db.createInvitation({ agencyId: session.agency.id, role: body.role, note: body.note, menuPermisos });
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

  router.put('/api/equipo/usuarios/:id/permisos', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    if (!requireAccountAdmin(req, res, session)) return;
    const target = await db.getUser(req.params.id);
    if (!target || target.agencyId !== session.agency.id) return err(res, 'Usuario no encontrado.', 404);
    if (target.role === 'admin') return err(res, 'Los administradores siempre tienen acceso completo.', 400);
    const body = await parseJson(req);
    const permisos = (body.permisos !== null && body.permisos !== undefined) ? body.permisos : null;
    const updated = await db.updateUserMenuPermisos(target.id, permisos);
    json(res, { user: updated });
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
          backUrl: `${CORS_ORIGIN}/suscripcion`,
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
    json(res, { tickets: await db.listSupportTicketsByAgency(session.agency.id), userEmail: session.user.email });
  });

  router.post('/api/soporte', async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const body = await parseJson(req);
    if (!body.subject || !body.message) return err(res, 'Completá el asunto y el mensaje.');
    const ticket = await db.createSupportTicket({ agencyId: session.agency.id, userId: session.user.id, subject: body.subject, message: body.message });
    if (mail.isConfigured()) {
      mail.sendSupportTicket({
        agencyName: session.agency.name,
        userName: `${session.user.nombre} ${session.user.apellido}`.trim(),
        email: body.email || '',
        phone: body.phone || '',
        subject: body.subject,
        message: body.message,
      }).catch(() => {});
    }
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
    const media = await db.listPropertyMedia(property.id);
    json(res, { property, media, owner, viaAgency });
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
    if (invitation.menuPermisos && invitation.role !== 'admin') {
      await db.updateUserMenuPermisos(user.id, invitation.menuPermisos);
    }
    await db.acceptInvitation(invitation.id);
    await auth.login(res, user.id);
    json(res, { user, agency }, 201);
  });
}
