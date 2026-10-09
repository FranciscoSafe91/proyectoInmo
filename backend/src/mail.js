import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.MAIL_SMTP_HOST || 'smtp.hostinger.com';
const SMTP_PORT = Number(process.env.MAIL_SMTP_PORT) || 465;
const SMTP_USER = process.env.MAIL_SMTP_USER || '';
const SMTP_PASS = process.env.MAIL_SMTP_PASS || '';
const FROM_ADDRESS = process.env.MAIL_FROM || SMTP_USER;
export const APP_URL = (process.env.APP_URL || process.env.CORS_ORIGIN || 'https://spyderconnect.com').replace(/\/+$/, '');

let _transport = null;

function getTransport() {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return _transport;
}

function baseHtml(content) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222">
      <div style="background:#1f6f54;padding:20px 28px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:1.4rem">SpyderConnect</h1>
      </div>
      <div style="padding:28px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
        ${content}
      </div>
      <p style="color:#aaa;font-size:12px;text-align:center;margin-top:16px">
        SpyderConnect — Sistema de gestión inmobiliaria compartida
      </p>
    </div>
  `;
}

// Todo dato que viene de usuarios (nombres, títulos, mensajes) se escapa antes de
// meterlo en el HTML: si no, una inmobiliaria podría inyectar links o formularios
// falsos en emails que salen desde nuestro dominio (phishing).
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Los asuntos van en un header: sin saltos de línea.
function oneLine(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').slice(0, 200);
}

export async function sendPasswordReset(to, resetUrl) {
  // El link lo arma el backend con APP_URL; igual se valida que apunte a nuestra app.
  if (!String(resetUrl).startsWith(`${APP_URL}/`)) {
    throw new Error('URL de reseteo fuera del dominio de la aplicación.');
  }
  await getTransport().sendMail({
    from: `"SpyderConnect" <${FROM_ADDRESS}>`,
    to,
    subject: 'Recuperación de contraseña',
    html: baseHtml(`
      <h2 style="margin-top:0">Recuperar contraseña</h2>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
      <p style="margin:24px 0">
        <a href="${esc(resetUrl)}"
           style="background:#1f6f54;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold">
          Restablecer contraseña
        </a>
      </p>
      <p style="color:#666;font-size:0.88rem">
        Este enlace expira en 1 hora.<br>
        Si no solicitaste esto, ignorá este email — tu contraseña no cambiará.
      </p>
    `),
  });
}

export async function sendWelcome(to, name) {
  await getTransport().sendMail({
    from: `"SpyderConnect" <${FROM_ADDRESS}>`,
    to,
    subject: '¡Bienvenido a SpyderConnect!',
    html: baseHtml(`
      <h2 style="margin-top:0">¡Bienvenido, ${esc(name)}!</h2>
      <p>Tu cuenta en SpyderConnect fue creada exitosamente.</p>
      <p>Ya podés ingresar y empezar a gestionar y compartir tus propiedades con otras inmobiliarias.</p>
      <p style="margin:24px 0">
        <a href="${APP_URL}"
           style="background:#1f6f54;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold">
          Ir a SpyderConnect
        </a>
      </p>
    `),
  });
}

export async function sendAlertMatch(to, { partnerAgencyName, propertyTitle, alertTitle, mudanzaInmediata }) {
  const urgencyBanner = mudanzaInmediata
    ? `<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:10px 16px;margin:16px 0;font-weight:bold;color:#856404">
        🚚 Mudanza inmediata — el cliente está listo para moverse
       </div>`
    : '';
  await getTransport().sendMail({
    from: `"SpyderConnect" <${FROM_ADDRESS}>`,
    to,
    subject: oneLine(`Nueva coincidencia${mudanzaInmediata ? ' 🚚 MUDANZA INMEDIATA' : ''}: ${alertTitle || propertyTitle}`),
    html: baseHtml(`
      <h2 style="margin-top:0">¡Encontramos una coincidencia!</h2>
      ${urgencyBanner}
      <p>La inmobiliaria <strong>${esc(partnerAgencyName)}</strong> tiene una propiedad que coincide con tu alerta <strong>"${esc(alertTitle || 'sin título')}"</strong>:</p>
      <p style="font-size:1.1rem;margin:16px 0"><strong>${esc(propertyTitle)}</strong></p>
      <p>Entrá a SpyderConnect para pedirle que te la comparta.</p>
      <p style="margin:24px 0">
        <a href="${APP_URL}/alertas"
           style="background:#1f6f54;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold">
          Ver coincidencias
        </a>
      </p>
    `),
  });
}

export async function sendSupportTicket({ agencyName, userName, email, phone, subject, message }) {
  await getTransport().sendMail({
    from: `"SpyderConnect" <${FROM_ADDRESS}>`,
    to: 'soporte@spyderconnect.com',
    subject: oneLine(`[Soporte] ${subject}`),
    html: baseHtml(`
      <h2 style="margin-top:0">Nueva consulta de soporte</h2>
      <p><strong>Inmobiliaria:</strong> ${esc(agencyName)}</p>
      <p><strong>Usuario:</strong> ${esc(userName)}</p>
      <p><strong>Email:</strong> ${esc(email || '-')}</p>
      <p><strong>Teléfono:</strong> ${esc(phone || '-')}</p>
      <p><strong>Asunto:</strong> ${esc(subject)}</p>
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:16px 0">
      <p style="white-space:pre-wrap">${esc(message)}</p>
    `),
  });
}

export function isConfigured() {
  return Boolean(SMTP_USER && SMTP_PASS);
}
