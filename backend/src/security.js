// security.js — rate limiting y protección CSRF, sin dependencias externas.

// ---------------------------------------------------------------------------
// IP del cliente
// ---------------------------------------------------------------------------
// En Hostinger la app corre detrás de un proxy: la IP del socket es la del proxy
// y la real viene en X-Forwarded-For. Se recorre de derecha a izquierda (las
// entradas de la derecha las agregan nuestros proxies; las de la izquierda las
// puede inventar el cliente) y se toma la primera IP pública.
const PRIVATE_IP = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|f[cd][0-9a-f]{2}:|fe80:|::ffff:(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.))/i;

export function clientIp(req) {
  const socketIp = (req.socket && req.socket.remoteAddress) || 'desconocida';
  const xff = req.headers['x-forwarded-for'];
  if (!xff) return socketIp;
  const parts = String(xff).split(',').map(s => s.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!PRIVATE_IP.test(parts[i])) return parts[i];
  }
  return parts[0] || socketIp;
}

// ---------------------------------------------------------------------------
// Rate limiting en memoria (ventana fija)
// ---------------------------------------------------------------------------
// Alcanza para una sola instancia de Node (el caso de Hostinger). Si algún día
// hay varias instancias, mover los contadores a MySQL o Redis.
const buckets = new Map(); // key -> { count, resetAt }

function hit(key, windowMs) {
  const nowMs = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt <= nowMs) {
    b = { count: 0, resetAt: nowMs + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  return b;
}

// Limpieza periódica para que el Map no crezca indefinidamente.
setInterval(() => {
  const nowMs = Date.now();
  for (const [key, b] of buckets) if (b.resetAt <= nowMs) buckets.delete(key);
}, 5 * 60 * 1000).unref();

/**
 * Cuenta un intento para `key`. Devuelve null si está dentro del límite, o los
 * segundos que faltan para poder reintentar si lo superó.
 */
export function consume(key, { max, windowMs }) {
  const b = hit(key, windowMs);
  if (b.count > max) return Math.ceil((b.resetAt - Date.now()) / 1000);
  return null;
}

/** Igual que consume() pero sin sumar: para chequear antes de procesar. */
export function isBlocked(key, { max }) {
  const b = buckets.get(key);
  if (!b || b.resetAt <= Date.now()) return null;
  return b.count >= max ? Math.ceil((b.resetAt - Date.now()) / 1000) : null;
}

export function reset(key) {
  buckets.delete(key);
}

export const LIMITS = {
  // Login: por IP (frena barridos de muchas cuentas) y fallos por email (frena
  // fuerza bruta sobre una cuenta concreta aunque cambie de IP).
  loginPerIp:        { max: 30, windowMs: 15 * 60 * 1000 },
  loginFailPerEmail: { max: 5,  windowMs: 15 * 60 * 1000 },
  registerPerIp:     { max: 5,  windowMs: 60 * 60 * 1000 },
  forgotPerIp:       { max: 5,  windowMs: 60 * 60 * 1000 },
  forgotPerEmail:    { max: 3,  windowMs: 60 * 60 * 1000 },
  resetPerIp:        { max: 10, windowMs: 15 * 60 * 1000 },
  invitePerIp:       { max: 10, windowMs: 15 * 60 * 1000 },
  webhookPerIp:      { max: 120, windowMs: 60 * 1000 },
  // Contraseña mal ingresada al confirmar una operación sensible (cambiar tarjeta).
  reauthFailPerUser: { max: 5,  windowMs: 15 * 60 * 1000 },
  // Cambios de tarjeta por agencia: frena el "card testing" (probar tarjetas robadas).
  cardChangePerAgency: { max: 5, windowMs: 24 * 60 * 60 * 1000 },
  verifyResendPerUser: { max: 3, windowMs: 60 * 60 * 1000 },
  verifyPerIp:       { max: 20, windowMs: 15 * 60 * 1000 },
  cspReportPerIp:    { max: 60, windowMs: 60 * 1000 },
};

// ---------------------------------------------------------------------------
// Política de contraseñas (solo para contraseñas nuevas: no afecta a las actuales)
// ---------------------------------------------------------------------------
export const PASSWORD_MIN_LENGTH = 10;

// Las más usadas en filtraciones (y variantes locales). No pretende ser completa:
// combinada con el largo mínimo y el rate limiting alcanza para frenar lo obvio.
const COMMON_PASSWORDS = new Set([
  '1234567890', '12345678910', '0123456789', '1111111111', '0000000000', 'qwertyuiop',
  'password123', 'password1234', 'contraseña', 'contrasena', 'contraseña123', 'contrasena123',
  'iloveyou123', 'qwerty1234', 'qwerty12345', 'abc1234567', 'abcdefghij', 'asdfghjkl1',
  'spyderconnect', 'spiderconnect', 'inmobiliaria', 'inmobiliaria1', 'inmobiliaria123',
  'argentina123', 'bocajuniors', 'riverplate', 'administrador', 'admin12345',
]);

/** Devuelve un mensaje de error, o null si la contraseña es aceptable. */
export function validateNewPassword(password, email = '') {
  const pwd = String(password || '');
  if (pwd.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (pwd.length > 200) return 'La contraseña es demasiado larga.';
  const lower = pwd.toLowerCase();
  if (COMMON_PASSWORDS.has(lower) || /^(.)\1+$/.test(pwd)) {
    return 'Esa contraseña es demasiado común. Elegí otra.';
  }
  const localPart = String(email).split('@')[0].toLowerCase();
  if (localPart.length >= 4 && lower.includes(localPart)) {
    return 'La contraseña no puede contener tu email.';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Concurrencia de subidas pesadas
// ---------------------------------------------------------------------------
// Cada formulario de propiedad con fotos se carga entero en memoria. Limitar
// cuántos se procesan a la vez evita que unas pocas requests tiren el proceso.
const MAX_CONCURRENT_UPLOADS = Number(process.env.MAX_CONCURRENT_UPLOADS) || 3;
let uploadsInProgress = 0;

/** Ejecuta fn si hay lugar; si no, devuelve null sin ejecutarla. */
export async function withUploadSlot(fn) {
  if (uploadsInProgress >= MAX_CONCURRENT_UPLOADS) return null;
  uploadsInProgress += 1;
  try {
    return { value: await fn() };
  } finally {
    uploadsInProgress -= 1;
  }
}

// ---------------------------------------------------------------------------
// CSRF: validación del header Origin
// ---------------------------------------------------------------------------
// Los navegadores mandan Origin en todo POST/PUT/DELETE y una página no lo puede
// falsificar. Si viene y no es nuestro, se rechaza. Si no viene, no es un
// navegador (curl, server-to-server) y por lo tanto no hay riesgo de CSRF.
function normalizeOrigin(value) {
  try { return new URL(value).origin; } catch { return null; }
}

const CONFIGURED_ORIGINS = [process.env.APP_URL, process.env.CORS_ORIGIN]
  .map(normalizeOrigin)
  .filter(Boolean);

const LOCAL_DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function isAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const o = normalizeOrigin(origin);
  if (!o) return false;
  if (CONFIGURED_ORIGINS.includes(o)) return true;
  // Mismo origen que el host al que llegó la request (cubre www / sin www).
  if (new URL(o).host === req.headers.host) return true;
  if (process.env.NODE_ENV !== 'production' && LOCAL_DEV_ORIGIN.test(o)) return true;
  return false;
}
