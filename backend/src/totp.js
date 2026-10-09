// totp.js — códigos de verificación en dos pasos (RFC 6238, compatible con
// Google Authenticator, Microsoft Authenticator, Authy, 1Password, etc.).
// Implementado con node:crypto, sin dependencias externas.

import { createHmac, randomBytes, createHash, timingSafeEqual } from 'node:crypto';

const STEP_SECONDS = 30;
const DIGITS = 6;
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf) {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { out += BASE32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str) {
  const clean = String(str).replace(/=+$/, '').replace(/\s+/g, '').toUpperCase();
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) throw new Error('Secreto TOTP inválido');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

export function generateSecret() {
  return base32Encode(randomBytes(20)); // 160 bits, lo recomendado por la RFC 4226
}

function codeAt(secret, counter) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', base32Decode(secret)).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(bin % 10 ** DIGITS).padStart(DIGITS, '0');
}

export function currentCounter(nowMs = Date.now()) {
  return Math.floor(nowMs / 1000 / STEP_SECONDS);
}

/**
 * Verifica un código aceptando ±1 paso (30 s) de desfase de reloj.
 * Devuelve el contador usado (para impedir reusar el mismo código) o null.
 * lastUsedCounter: el último contador aceptado para ese usuario.
 */
export function verifyCode(secret, code, lastUsedCounter = -1, nowMs = Date.now()) {
  const clean = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(clean)) return null;
  const now = currentCounter(nowMs);
  for (const c of [now - 1, now, now + 1]) {
    if (c <= lastUsedCounter) continue; // código ya usado: un código robado no se puede repetir
    const expected = Buffer.from(codeAt(secret, c));
    if (timingSafeEqual(expected, Buffer.from(clean))) return c;
  }
  return null;
}

export function otpauthUrl(secret, accountLabel, issuer = 'SpyderConnect') {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

// Códigos de recuperación: de un solo uso, para cuando se pierde el teléfono.
// Se guardan hasheados; el usuario los ve una sola vez.
export function generateRecoveryCodes(count = 8) {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString('hex').toUpperCase(); // 10 caracteres
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export function hashRecoveryCode(code) {
  return createHash('sha256').update(String(code).replace(/[\s-]/g, '').toUpperCase()).digest('hex');
}

// Solo para tests: código válido en un instante dado.
export function _codeForTest(secret, nowMs = Date.now()) {
  return codeAt(secret, currentCounter(nowMs));
}
