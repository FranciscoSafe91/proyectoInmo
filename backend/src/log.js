// log.js — redacción de datos sensibles en los logs.
//
// installLogRedaction() envuelve console.log/info/warn/error para que TODO lo que
// se escriba pase por redact() antes de llegar al log de Hostinger. Así un
// console.error(e) con la respuesta de Mercado Pago o un email de usuario no
// deja datos personales ni de tarjetas en texto plano.

import { format } from 'node:util';

// Algoritmo de Luhn: distingue números de tarjeta reales de otros números
// largos (ids de pago, timestamps) para no taparlos innecesariamente.
function passesLuhn(digits) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function redact(text) {
  return String(text)
    // Números de tarjeta (13 a 19 dígitos, con o sin separadores) que pasan Luhn.
    .replace(/\b(?:\d[ -]?){12,18}\d\b/g, (m) => {
      const digits = m.replace(/[ -]/g, '');
      return passesLuhn(digits) ? `[tarjeta ****${digits.slice(-4)}]` : m;
    })
    // Emails: se deja la primera letra y el dominio.
    .replace(/([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '$1***@$2')
    // Secretos en query strings o JSON.
    .replace(/((?:token|key|password|secret|access_token|card_token_id|security_code)["']?\s*[=:]\s*["']?)[^&\s"',}]+/gi, '$1[oculto]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [oculto]');
}

let installed = false;
export function installLogRedaction() {
  if (installed) return;
  installed = true;
  for (const level of ['log', 'info', 'warn', 'error']) {
    const original = console[level].bind(console);
    console[level] = (...args) => original(redact(format(...args)));
  }
}
