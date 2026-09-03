// server.js — backend para el frontend React (API JSON pura)

import http from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { URL } from 'node:url';

import { Router } from './router.js';
import * as db from './db.js';
import * as mercadopago from './mercadopago.js';
import { registerApiRoutes } from './api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
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

// Webhook Mercado Pago
router.post('/webhooks/mercadopago', async (req, res) => {
  let raw = '';
  req.on('data', (chunk) => (raw += chunk));
  req.on('end', async () => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const body = raw ? JSON.parse(raw) : {};
      const type = body.type || url.searchParams.get('type');
      const dataId = (body.data && body.data.id) || url.searchParams.get('data.id') || url.searchParams.get('id');
      if (type === 'payment' && dataId && mercadopago.isConfigured()) {
        const payment = await mercadopago.getPayment(dataId);
        const agencyId = payment && payment.external_reference;
        if (agencyId && payment.status === 'approved') {
          await db.applySuccessfulPayment(agencyId, { amount: payment.transaction_amount, currency: payment.currency_id || 'ARS', method: 'mercadopago', mpPaymentId: String(payment.id) });
        }
      }
    } catch (e) { console.error('Error procesando webhook de Mercado Pago:', e); }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
  });
});

const MIME = {
  '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp',
};

function serveStatic(req, res, pathname) {
  if (pathname === '/' || pathname.endsWith('/')) return false;
  const filePath = join(PUBLIC_DIR, pathname);
  if (!filePath.startsWith(PUBLIC_DIR) || !existsSync(filePath) || !statSync(filePath).isFile()) return false;
  const ext = extname(filePath);
  const content = readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(content);
  return true;
}

const server = http.createServer(async (req, res) => {
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

    const match = router.match(req.method, pathname);
    if (!match) {
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

server.listen(PORT, () => {
  console.log(`\n✔ Backend SpiderConect corriendo en http://localhost:${PORT}\n`);
});
