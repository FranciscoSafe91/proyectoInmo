// server.js — backend para el frontend React (API JSON pura)

import 'dotenv/config';
import http from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, sep } from 'node:path';
import { URL } from 'node:url';

import { Router } from './router.js';
import * as db from './db.js';
import * as mercadopago from './mercadopago.js';
import { registerApiRoutes } from './api.js';
import { isSecureRequest } from './auth.js';
import * as payments from './payments.js';
import * as security from './security.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
const SPA_DIR    = join(PUBLIC_DIR, 'app');
const LOGOS_DIR = join(PUBLIC_DIR, 'uploads', 'logos');
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

if (!existsSync(LOGOS_DIR)) mkdirSync(LOGOS_DIR, { recursive: true });

const router = new Router();
registerApiRoutes(router);

// Feed público
router.get('/api/v1/feed/:agencyId', async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const key = url.searchParams.get('key');
  const agency = await db.verifyAgencyApiKey(req.params.agencyId, key);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  };
  if (!agency) {
    res.writeHead(401, headers);
    return res.end(JSON.stringify({ error: 'Clave de acceso inválida o inmobiliaria inexistente.' }));
  }
  if (!(await payments.hasActiveSubscription(agency.id))) {
    res.writeHead(402, headers);
    return res.end(JSON.stringify({ error: 'La suscripción de esta inmobiliaria no está activa.' }));
  }
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const baseUrl = `${proto}://${req.headers.host}`;
  const feedItems = await db.listFeedPropertiesForAgency(agency.id);
  const items = await Promise.all(feedItems.map(async ({ property, source, ownerAgencyId }) => {
    const ownerAgency = await db.getAgency(ownerAgencyId);
    return {
      id: property.id, titulo: property.title, descripcion: property.description,
      operacion: property.operation, tipo: property.type, precio: property.price, moneda: property.currency,
      direccion: property.address, ciudad: property.city, provincia: property.province,
      dormitorios: property.bedrooms, banos: property.bathrooms, superficieM2: property.areaM2,
      origen: source, inmobiliariaOrigen: ownerAgency ? ownerAgency.name : null,
      actualizadoEn: property.updatedAt,
      urlPublica: `${baseUrl}/public/propiedades/${property.id}?via=${agency.id}`,
    };
  }));
  res.writeHead(200, headers);
  res.end(JSON.stringify({
    inmobiliaria: { id: agency.id, nombre: agency.name, ciudad: agency.city, logoUrl: agency.logoPath ? `${baseUrl}${agency.logoPath}` : null, colorMarca: agency.brandColor || '#1f6f54' },
    generadoEn: new Date().toISOString(),
    propiedades: items,
  }));
});

// Reportes de violaciones de la CSP (los manda el navegador solo). Sirven para
// ajustar la política antes de pasarla a modo estricto.
router.post('/api/csp-report', async (req, res) => {
  const reply = () => { res.writeHead(204); res.end(); };
  if (security.consume(`csp:${security.clientIp(req)}`, security.LIMITS.cspReportPerIp)) return reply();
  let raw = '';
  try { raw = await readLimitedBody(req, 16 * 1024); } catch { return reply(); }
  try {
    const parsed = JSON.parse(raw);
    const r = parsed['csp-report'] || (Array.isArray(parsed) && parsed[0] && parsed[0].body) || parsed;
    const directive = r['violated-directive'] || r.effectiveDirective || r['effective-directive'];
    const blocked = r['blocked-uri'] || r.blockedURL;
    const page = r['document-uri'] || r.documentURL;
    // Sin query string: algunos recursos (p. ej. el antifraude de MP) llevan datos del navegador en la URL.
    const clean = (u) => String(u || '').split('?')[0].slice(0, 200);
    console.warn(`[csp] ${directive} bloquearía ${clean(blocked)} en ${clean(page)}`);
  } catch { /* reporte malformado: se ignora */ }
  reply();
});

// Webhook Mercado Pago
// Respuestas: 200 = procesado / ya procesado / irrelevante (MP no reintenta).
//             401 = firma inválida.  500 = error transitorio (MP reintenta).
const WEBHOOK_MAX_BYTES = 64 * 1024;

function readLimitedBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > maxBytes) { reject(new Error('Body demasiado grande')); req.destroy(); }
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

router.post('/webhooks/mercadopago', async (req, res) => {
  const reply = (status, text) => { res.writeHead(status, { 'Content-Type': 'text/plain' }); res.end(text); };

  const retryAfter = security.consume(`webhook:${security.clientIp(req)}`, security.LIMITS.webhookPerIp);
  if (retryAfter) return reply(429, 'too many requests');

  if (!mercadopago.isConfigured()) {
    console.error('[webhook MP] Notificación recibida pero MP no está configurado (MP_ACCESS_TOKEN / MP_WEBHOOK_SECRET).');
    return reply(503, 'not configured');
  }

  let raw;
  try { raw = await readLimitedBody(req, WEBHOOK_MAX_BYTES); } catch { return reply(413, 'too large'); }

  const url = new URL(req.url, `http://${req.headers.host}`);
  let body = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { return reply(400, 'invalid json'); }

  // MP firma el data.id que manda en la query string; el body es el respaldo.
  const dataId = url.searchParams.get('data.id') || (body.data && body.data.id) || url.searchParams.get('id');
  const type = body.type || url.searchParams.get('type') || url.searchParams.get('topic');

  const validSignature = mercadopago.verifyWebhookSignature({
    xSignature: req.headers['x-signature'],
    xRequestId: req.headers['x-request-id'],
    dataId,
  });
  if (!validSignature) {
    console.warn(`[webhook MP] Firma inválida desde ${security.clientIp(req)} (tipo=${type}, id=${dataId}).`);
    return reply(401, 'invalid signature');
  }

  try {
    const outcome = await payments.processNotification(type, dataId);
    console.log(`[webhook MP] ${type} ${dataId}: ${outcome}`);
    return reply(200, 'ok');
  } catch (e) {
    console.error(`[webhook MP] Error procesando ${type} ${dataId}:`, e.message);
    return reply(500, 'error');
  }
});

const MIME = {
  '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  // Con X-Content-Type-Options: nosniff el navegador ya no adivina el tipo: cada
  // extensión que se sirva tiene que estar declarada.
  '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

// Content-Security-Policy para las páginas HTML. Arranca en modo Report-Only:
// no bloquea nada, solo reporta a /api/csp-report lo que bloquearía. Cuando el
// log quede limpio (incluido el Brick de Mercado Pago en uso real) se pasa a
// modo estricto con CSP_ENFORCE=true.
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://sdk.mercadopago.com https://*.mercadopago.com https://*.mlstatic.com https://cdnjs.cloudflare.com",
  // 'unsafe-inline' en estilos: React usa atributos style={...} en muchos componentes.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://*.mlstatic.com",
  "font-src 'self' data: https://fonts.gstatic.com https://*.mlstatic.com",
  // *.mercadolivre.com: el SDK de MP carga desde ahí su huella antifraude del dispositivo.
  "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://img.youtube.com https://*.tile.openstreetmap.org https://cdnjs.cloudflare.com https://*.mlstatic.com https://*.mercadopago.com https://*.mercadolibre.com https://*.mercadolivre.com",
  "media-src 'self' blob: https://res.cloudinary.com",
  "connect-src 'self' https://api.cloudinary.com https://nominatim.openstreetmap.org https://api.mercadopago.com https://*.mercadopago.com https://*.mercadolibre.com https://*.mercadolivre.com https://*.mlstatic.com",
  "frame-src https://www.youtube.com https://*.mercadopago.com https://*.mercadolibre.com https://www.mercadolibre.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.mercadopago.com",
  "object-src 'none'",
  'report-uri /api/csp-report',
].join('; ');

function setHtmlSecurityHeaders(res) {
  const header = process.env.CSP_ENFORCE === 'true' ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only';
  res.setHeader(header, CSP);
}

// Se sirve en streaming: antes se leía el archivo entero a memoria (un video de
// cientos de MB por request podía tirar el proceso).
function sendFile(res, filePath, size) {
  const ext = extname(filePath);
  if (ext === '.html') setHtmlSecurityHeaders(res);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': size });
  createReadStream(filePath).on('error', () => res.destroy()).pipe(res);
}

function serveStatic(req, res, pathname) {
  if (pathname === '/' || pathname.endsWith('/')) return false;
  // Primero busca en public/ (uploads, widget.js, etc.), luego en public/app/ (build de React).
  for (const baseDir of [PUBLIC_DIR, SPA_DIR]) {
    const filePath = join(baseDir, pathname);
    if (!filePath.startsWith(baseDir + sep) || !existsSync(filePath)) continue;
    const stats = statSync(filePath);
    if (!stats.isFile()) continue;
    sendFile(res, filePath, stats.size);
    return true;
  }
  return false;
}

// Headers de seguridad comunes a todas las respuestas. res.setHeader() se combina
// con lo que después pase cada handler a res.writeHead(). La CSP va solo en HTML
// (ver setHtmlSecurityHeaders).
function setSecurityHeaders(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (isSecureRequest(req)) {
    // Sin includeSubDomains hasta confirmar que todos los subdominios tienen HTTPS.
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
}

const server = http.createServer(async (req, res) => {
  setSecurityHeaders(req, res);
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);

    // CORS pre-flight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': CORS_ORIGIN,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      return res.end();
    }

    // Archivos estáticos (logos subidos, widget.js)
    if (req.method === 'GET' && serveStatic(req, res, pathname)) return;

    // CSRF: ninguna operación que modifica datos de la API puede venir de otro sitio.
    if (pathname.startsWith('/api/') && pathname !== '/api/csp-report'
        && !['GET', 'HEAD'].includes(req.method) && !security.isAllowedOrigin(req)) {
      console.warn(`[csrf] ${req.method} ${pathname} rechazado: Origin ${req.headers.origin}`);
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'Origen no permitido.' }));
    }

    const match = router.match(req.method, pathname);
    if (!match) {
      // En producción: cualquier ruta no encontrada devuelve el index.html del SPA
      if (req.method === 'GET' && existsSync(join(SPA_DIR, 'index.html'))) {
        const html = readFileSync(join(SPA_DIR, 'index.html'));
        setHtmlSecurityHeaders(res);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(html);
      }
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': CORS_ORIGIN });
      return res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
    }
    req.params = match.params;
    await match.handler(req, res);
  } catch (e) {
    console.error('Error atendiendo la solicitud:', e);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    res.end(JSON.stringify({ error: 'Error interno del servidor' }));
  }
});

// Timeouts: cortan conexiones que mandan headers o bodies a cuentagotas (slowloris).
// requestTimeout es amplio porque hay subidas de video de hasta 200 MB.
server.headersTimeout = 30 * 1000;
server.requestTimeout = 20 * 60 * 1000;
server.keepAliveTimeout = 5 * 1000;

server.listen(PORT, () => {
  console.log(`\n✔ Backend SpiderConect corriendo en http://localhost:${PORT}\n`);
  if (!process.env.MP_ACCESS_TOKEN !== !process.env.MP_WEBHOOK_SECRET) {
    console.warn('⚠ Mercado Pago a medio configurar: hacen falta MP_ACCESS_TOKEN y MP_WEBHOOK_SECRET. Los pagos quedan deshabilitados.');
  }
  if (!process.env.APP_URL && !process.env.CORS_ORIGIN) {
    console.warn('⚠ Falta APP_URL (o CORS_ORIGIN): los links de los emails apuntan a https://spyderconnect.com por defecto.');
  }
});

// Tareas periódicas. unref() para que no impidan que el proceso termine.
const HOUR = 60 * 60 * 1000;
setInterval(() => {
  db.deleteExpiredSessions().catch(e => console.error('[sesiones] Error limpiando sesiones vencidas:', e.message));
}, 6 * HOUR).unref();

if (mercadopago.isConfigured()) {
  const runReconcile = () => payments.reconcile().catch(e => console.error('[conciliación] Error:', e.message));
  setTimeout(runReconcile, 60 * 1000).unref(); // al minuto de arrancar
  setInterval(runReconcile, 6 * HOUR).unref();
}
