// validation.js — validación de entrada sin dependencias externas.
//
// Dos capas:
//  1. assertSafeShape(): límites genéricos para CUALQUIER body (largo de strings,
//     tamaño de arrays, profundidad). Frena payloads abusivos antes de tocar la DB.
//  2. Reglas por endpoint (enums, rangos, formatos) con los helpers de abajo.
//
// Los errores se lanzan como ValidationError (status 400); server.js los
// convierte en una respuesta JSON { error } sin exponer detalles internos.

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
    this.expose = true; // el mensaje es apto para mostrarle al usuario
  }
}

const fail = (message) => { throw new ValidationError(message); };

// ---------------------------------------------------------------------------
// Capa 1: forma general del body
// ---------------------------------------------------------------------------
const MAX_STRING = 20000;
const MAX_ARRAY = 500;
const MAX_KEYS = 300;
const MAX_DEPTH = 6;

export function assertSafeShape(value, depth = 0) {
  if (depth > MAX_DEPTH) fail('La solicitud tiene una estructura demasiado anidada.');
  if (typeof value === 'string') {
    if (value.length > MAX_STRING) fail('Uno de los textos es demasiado largo.');
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY) fail('La solicitud tiene demasiados elementos.');
    value.forEach(v => assertSafeShape(v, depth + 1));
    return;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length > MAX_KEYS) fail('La solicitud tiene demasiados campos.');
    for (const k of keys) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') fail('Campo no permitido.');
      assertSafeShape(value[k], depth + 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Capa 2: helpers por campo. Todos ignoran undefined (campo no enviado).
// ---------------------------------------------------------------------------
export function maxLen(value, max, label) {
  if (value === undefined || value === null) return;
  if (typeof value !== 'string' && typeof value !== 'number') fail(`${label}: formato inválido.`);
  if (String(value).length > max) fail(`${label}: máximo ${max} caracteres.`);
}

export function oneOf(value, allowed, label, { allowEmpty = false } = {}) {
  if (value === undefined || value === null) return;
  if (allowEmpty && value === '') return;
  if (!allowed.includes(value)) fail(`${label}: valor no permitido.`);
}

// Acepta números o strings numéricos; '' y null = "sin dato".
export function numberIn(value, { min = 0, max = 1e12 } = {}, label) {
  if (value === undefined || value === null || value === '') return;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) fail(`${label}: número fuera de rango.`);
}

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,}$/;
export function email(value, label = 'Email') {
  if (typeof value !== 'string' || value.length > 254 || !EMAIL_RE.test(value.trim())) fail(`${label}: formato inválido.`);
}

export function arrayOfStrings(value, { maxItems = 200, maxLength = 64 } = {}, label) {
  if (value === undefined || value === null) return;
  const arr = Array.isArray(value) ? value : [value];
  if (arr.length > maxItems) fail(`${label}: demasiados elementos.`);
  for (const v of arr) if (typeof v !== 'string' || v.length > maxLength) fail(`${label}: formato inválido.`);
}

// ---------------------------------------------------------------------------
// Dominios (deben coincidir con el frontend)
// ---------------------------------------------------------------------------
export const PROPERTY_TYPES = ['casa', 'departamento', 'ph', 'terreno', 'local', 'oficina', 'otro']; // utils.js TYPE_LABELS
export const OPERATIONS = ['venta', 'alquiler'];
export const CURRENCIES = ['ARS', 'USD'];
export const PROPERTY_STATUSES = ['publicada', 'borrador', 'pausada'];
export const ACCOUNT_TYPES = ['inmobiliaria', 'agente_independiente'];
export const ROLES = ['admin', 'agente'];
// pages/Team.jsx y pages/Usuarios.jsx
export const MENU_SECTIONS = ['propiedades', 'compartidas', 'buscar_match', 'matcheadas', 'socios', 'alertas', 'invitaciones'];
export const MENU_ACTIONS = [
  'crear_propiedades', 'editar_propiedades', 'eliminar_propiedades', 'publicar_propiedades',
  'compartir_propiedades', 'responder_compartidas', 'gestionar_socios', 'crear_alertas', 'invitar_equipo',
];

const PROPERTY_NUMERIC = {
  price: [0, 1e12], bedrooms: [0, 1000], bathrooms: [0, 1000], areaM2: [0, 1e8],
  latitud: [-90, 90], longitud: [-180, 180],
  anchoTerreno: [0, 1e6], largoTerreno: [0, 1e6], superficieTerreno: [0, 1e8], superficieTotal: [0, 1e8],
  superficieCubierta: [0, 1e8], superficieDescubierta: [0, 1e8], superficieSemicubierta: [0, 1e8],
  fondoLibre: [0, 1e6], antiguedad: [0, 1000],
  cocherasCubiertas: [0, 10000], cocherasDescubiertas: [0, 10000], cocherasSemicubiertas: [0, 10000],
  pisosEdificio: [0, 1000], deptosPorPiso: [0, 1000], ascensoresPrincipales: [0, 1000], expensas: [0, 1e10],
};

export function validateProperty(body, { requireTitle }) {
  assertSafeShape(body);
  if (requireTitle && !body.title) fail('El título es obligatorio.');
  maxLen(body.title, 200, 'Título');
  maxLen(body.description, 10000, 'Descripción');
  oneOf(body.type, PROPERTY_TYPES, 'Tipo');
  oneOf(body.operation, OPERATIONS, 'Operación');
  oneOf(body.currency, CURRENCIES, 'Moneda');
  oneOf(body.expensasMoneda, CURRENCIES, 'Moneda de expensas', { allowEmpty: true });
  oneOf(body.status, PROPERTY_STATUSES, 'Estado');
  for (const [field, [min, max]] of Object.entries(PROPERTY_NUMERIC)) numberIn(body[field], { min, max }, field);
  maxLen(body.youtubeUrl, 300, 'Link de YouTube');
  if (body.youtubeUrl && !/^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(body.youtubeUrl)) {
    fail('El link de video tiene que ser de YouTube.');
  }
}

export function validateAlert(body) {
  assertSafeShape(body);
  maxLen(body.title, 200, 'Título');
  oneOf(body.type, PROPERTY_TYPES, 'Tipo', { allowEmpty: true });
  oneOf(body.operation, OPERATIONS, 'Operación', { allowEmpty: true });
  oneOf(body.currency, CURRENCIES, 'Moneda', { allowEmpty: true });
  for (const f of ['minPrice', 'maxPrice', 'minAreaM2', 'minBedrooms', 'minBathrooms', 'minCocheras']) {
    numberIn(body[f], { min: 0, max: 1e12 }, f);
  }
}

// { secciones: [...], acciones: [...] } (formato nuevo) o array de secciones (viejo).
export function validateMenuPermisos(value) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach(v => oneOf(v, MENU_SECTIONS, 'Sección'));
    return;
  }
  if (typeof value !== 'object') fail('Permisos: formato inválido.');
  const extra = Object.keys(value).filter(k => k !== 'secciones' && k !== 'acciones');
  if (extra.length) fail('Permisos: formato inválido.');
  (value.secciones || []).forEach(v => oneOf(v, MENU_SECTIONS, 'Sección'));
  (value.acciones || []).forEach(v => oneOf(v, MENU_ACTIONS, 'Acción'));
}

// ---------------------------------------------------------------------------
// Tipo real de un archivo según sus primeros bytes ("magic bytes"). El
// Content-Type que manda el navegador lo elige el cliente y no sirve para
// decidir qué se acepta.
// ---------------------------------------------------------------------------
export function detectMediaType(buffer) {
  if (!buffer || buffer.length < 12) return null;
  const b = buffer;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.toString('ascii', 0, 6) === 'GIF87a' || b.toString('ascii', 0, 6) === 'GIF89a') return 'image/gif';
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (b.toString('ascii', 4, 8) === 'ftyp') {
    return b.toString('ascii', 8, 10) === 'qt' ? 'video/quicktime' : 'video/mp4';
  }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'video/webm';
  return null;
}

export function validatePercentMap(map, label) {
  if (map === undefined || map === null) return;
  if (typeof map !== 'object' || Array.isArray(map)) fail(`${label}: formato inválido.`);
  for (const v of Object.values(map)) numberIn(v, { min: 0, max: 100 }, label);
}
