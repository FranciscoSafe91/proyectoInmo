import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.MAIL_SMTP_HOST || 'smtp.hostinger.com';
const SMTP_PORT = Number(process.env.MAIL_SMTP_PORT) || 465;
const SMTP_USER = process.env.MAIL_SMTP_USER || '';
const SMTP_PASS = process.env.MAIL_SMTP_PASS || '';
const FROM_ADDRESS = process.env.MAIL_FROM || SMTP_USER;

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

export async function sendPasswordReset(to, resetUrl) {
  await getTransport().sendMail({
    from: `"SpyderConnect" <${FROM_ADDRESS}>`,
    to,
    subject: 'Recuperación de contraseña',
    html: baseHtml(`
      <h2 style="margin-top:0">Recuperar contraseña</h2>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
      <p style="margin:24px 0">
        <a href="${resetUrl}"
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
      <h2 style="margin-top:0">¡Bienvenido, ${name}!</h2>
      <p>Tu cuenta en SpyderConnect fue creada exitosamente.</p>
      <p>Ya podés ingresar y empezar a gestionar y compartir tus propiedades con otras inmobiliarias.</p>
      <p style="margin:24px 0">
        <a href="https://spyderconnect.com"
           style="background:#1f6f54;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold">
          Ir a SpyderConnect
        </a>
      </p>
    `),
  });
}

export async function sendAlertMatch(to, { partnerAgencyName, propertyTitle, alertTitle }) {
  await getTransport().sendMail({
    from: `"SpyderConnect" <${FROM_ADDRESS}>`,
    to,
    subject: `Nueva coincidencia: ${alertTitle || propertyTitle}`,
    html: baseHtml(`
      <h2 style="margin-top:0">¡Encontramos una coincidencia!</h2>
      <p>La inmobiliaria <strong>${partnerAgencyName}</strong> tiene una propiedad que coincide con tu alerta <strong>"${alertTitle || 'sin título'}"</strong>:</p>
      <p style="font-size:1.1rem;margin:16px 0"><strong>${propertyTitle}</strong></p>
      <p>Entrá a SpyderConnect para pedirle que te la comparta.</p>
      <p style="margin:24px 0">
        <a href="https://spyderconnect.com/alertas"
           style="background:#1f6f54;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold">
          Ver coincidencias
        </a>
      </p>
    `),
  });
}

export function isConfigured() {
  return Boolean(SMTP_USER && SMTP_PASS);
}
