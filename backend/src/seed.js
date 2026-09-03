// seed.js — carga datos de ejemplo para poder probar el sistema de inmediato.
// Correr con: npm run seed  (o) node src/seed.js

import * as db from './db.js';
import * as auth from './auth.js';

db.resetDatabase();

function makeAgencyWithAdmin({ name, slug, email, phone, city, adminName, adminEmail, password, accountType }) {
  const agency = db.createAgency({ name, slug, email, phone, city, accountType });
  const { hash, salt } = auth.hashPassword(password);
  const user = db.createUser({
    agencyId: agency.id,
    name: adminName,
    email: adminEmail,
    passwordHash: hash,
    passwordSalt: salt,
    role: 'admin',
  });
  return { agency, user };
}

const DEMO_PASSWORD = 'demo1234';

const a1 = makeAgencyWithAdmin({
  name: 'Inmobiliaria del Centro',
  slug: 'inmobiliaria-del-centro',
  email: 'contacto@delcentro.com',
  phone: '351-555-0101',
  city: 'Córdoba',
  adminName: 'Marina Sosa',
  adminEmail: 'marina@delcentro.com',
  password: DEMO_PASSWORD,
});

const a2 = makeAgencyWithAdmin({
  name: 'Norte Propiedades',
  slug: 'norte-propiedades',
  email: 'hola@nortepropiedades.com',
  phone: '351-555-0202',
  city: 'Córdoba',
  adminName: 'Julián Ferreyra',
  adminEmail: 'julian@nortepropiedades.com',
  password: DEMO_PASSWORD,
});

const a3 = makeAgencyWithAdmin({
  name: 'Sur Bienes Raíces',
  slug: 'sur-bienes-raices',
  email: 'info@surbienesraices.com',
  phone: '351-555-0303',
  city: 'Villa Carlos Paz',
  adminName: 'Camila Nuñez',
  adminEmail: 'camila@surbienesraices.com',
  password: DEMO_PASSWORD,
});

const a4 = makeAgencyWithAdmin({
  name: 'Lucía Paz — Agente Inmobiliaria',
  slug: 'lucia-paz-agente',
  email: 'lucia@agente.com',
  phone: '351-555-0404',
  city: 'Córdoba',
  adminName: 'Lucía Paz',
  adminEmail: 'lucia@agente.com',
  password: DEMO_PASSWORD,
  accountType: 'agente_independiente',
});

// -----------------------------------------------------------------------
// Equipo (varios usuarios por cuenta) + panel de administración de Safe
// Inmuebles: agregamos un segundo usuario a "Inmobiliaria del Centro" para
// mostrar el equipo, y un usuario con isPlatformAdmin=true (dueños de la
// plataforma) que ve /admin.
// -----------------------------------------------------------------------
const rocioHash = auth.hashPassword(DEMO_PASSWORD);
db.createUser({
  agencyId: a1.agency.id,
  name: 'Rocío Beltrán',
  email: 'rocio@delcentro.com',
  passwordHash: rocioHash.hash,
  passwordSalt: rocioHash.salt,
  role: 'agente',
});

const platformAdminHash = auth.hashPassword(DEMO_PASSWORD);
db.createUser({
  agencyId: a1.agency.id,
  name: 'Safe Inmuebles (admin de la plataforma)',
  email: 'admin@safeinmuebles.com',
  passwordHash: platformAdminHash.hash,
  passwordSalt: platformAdminHash.salt,
  role: 'admin',
  isPlatformAdmin: true,
});

// -----------------------------------------------------------------------
// Estados de suscripción variados, para poder probar todos los casos sin
// tener que esperar 14 días de prueba gratis.
// -----------------------------------------------------------------------
const plan = db.getPlan();

// Centro: suscripción activa, con historial de 2 pagos (uno simulado y uno
// marcado manualmente, como haría Safe Inmuebles al cobrar por transferencia).
const centroPayment1 = db.applySuccessfulPayment(a1.agency.id, {
  amount: plan.priceARS,
  currency: 'ARS',
  method: 'simulado',
});
db.createPayment({
  agencyId: a1.agency.id,
  subscriptionId: centroPayment1.subscriptionId,
  amount: plan.priceARS,
  currency: 'ARS',
  status: 'aprobado',
  method: 'manual',
});

// Sur: la prueba gratis ya venció y todavía no pagó (para probar el estado "vencida").
const pastDate = new Date();
pastDate.setDate(pastDate.getDate() - 3);
db.updateSubscription(a3.agency.id, { trialEndsAt: pastDate.toISOString() });

// Lucía (agente independiente): canceló su suscripción.
db.updateSubscription(a4.agency.id, { status: 'cancelada' });

// Norte queda con su prueba gratis de 14 días en curso (estado por defecto).

// Sociedad ya aceptada entre Centro y Norte
const p1 = db.createPartnershipRequest({ fromAgencyId: a1.agency.id, toAgencyId: a2.agency.id });
db.respondPartnership(p1.id, 'aceptada');

// Solicitud de sociedad pendiente de Sur hacia Centro (para probar "Invitaciones")
db.createPartnershipRequest({ fromAgencyId: a3.agency.id, toAgencyId: a1.agency.id });

// Sociedad ya aceptada entre Centro y la agente independiente Lucía Paz
const p2 = db.createPartnershipRequest({ fromAgencyId: a4.agency.id, toAgencyId: a1.agency.id });
db.respondPartnership(p2.id, 'aceptada');

// Propiedades de "Inmobiliaria del Centro"
const prop1 = db.createProperty({
  agencyId: a1.agency.id,
  title: 'Casa 3 ambientes con jardín en Nueva Córdoba',
  description: 'Amplia casa reciclada, luminosa, a metros del Parque Sarmiento. Apta crédito.',
  operation: 'venta',
  type: 'casa',
  price: 145000,
  currency: 'USD',
  address: 'Av. Poeta Lugones 1234',
  city: 'Córdoba',
  province: 'Córdoba',
  bedrooms: 3,
  bathrooms: 2,
  areaM2: 180,
  status: 'publicada',
});

const prop2 = db.createProperty({
  agencyId: a1.agency.id,
  title: 'Departamento 2 ambientes a estrenar',
  description: 'Edificio nuevo con amenities, cochera opcional.',
  operation: 'alquiler',
  type: 'departamento',
  price: 350000,
  currency: 'ARS',
  address: 'Bv. Chacabuco 850',
  city: 'Córdoba',
  province: 'Córdoba',
  bedrooms: 1,
  bathrooms: 1,
  areaM2: 55,
  status: 'publicada',
});

// Propiedad de "Norte Propiedades"
const prop3 = db.createProperty({
  agencyId: a2.agency.id,
  title: 'Terreno de esquina en zona residencial',
  description: 'Terreno de 500 m², servicios completos, ideal para desarrollo.',
  operation: 'venta',
  type: 'terreno',
  price: 60000,
  currency: 'USD',
  address: 'Calle Los Sauces s/n',
  city: 'Córdoba',
  province: 'Córdoba',
  bedrooms: 0,
  bathrooms: 0,
  areaM2: 500,
  status: 'publicada',
});

// Centro comparte prop1 con Norte, Norte ya la aceptó, y Centro además la
// autorizó para publicación web -> aparece en "Compartidas conmigo" de Norte
// Y en su feed/widget ("Publicar en mi web").
const share1 = db.createPropertyShare({
  propertyId: prop1.id,
  ownerAgencyId: a1.agency.id,
  targetAgencyId: a2.agency.id,
});
db.respondPropertyShare(share1.id, 'aceptada');
db.setSharePublishAuthorization(share1.id, true);

// Centro también comparte esa misma prop1 con Lucía (socia independiente) y
// Lucía la aceptó, pero Centro NO le dio autorización de publicación web ->
// para mostrar el caso "solo uso interno": Lucía la puede ver y trabajar
// dentro del sistema (y en su ficha propia), pero no sale en su feed/widget.
const share1c = db.createPropertyShare({
  propertyId: prop1.id,
  ownerAgencyId: a1.agency.id,
  targetAgencyId: a4.agency.id,
});
db.respondPropertyShare(share1c.id, 'aceptada');

// Norte comparte prop3 con Centro, pendiente de aceptar (para probar "Invitaciones")
db.createPropertyShare({
  propertyId: prop3.id,
  ownerAgencyId: a2.agency.id,
  targetAgencyId: a1.agency.id,
});

// Lucía (agente independiente, socia de Centro) tiene una alerta activa que
// coincide con el departamento en alquiler de Centro -> demuestra "Alertas"
db.createSearchAlert({
  agencyId: a4.agency.id,
  title: 'Depto en alquiler para cliente urgente',
  operation: 'alquiler',
  type: 'departamento',
  city: 'Córdoba',
  currency: 'ARS',
  maxPrice: 500000,
});

console.log('\n✔ Datos de ejemplo cargados.\n');
console.log('Podés ingresar con cualquiera de estos usuarios (contraseña para todos: ' + DEMO_PASSWORD + '):\n');
console.log('  · marina@delcentro.com      — Inmobiliaria del Centro (suscripción ACTIVA, tiene una coincidencia de alerta esperando en "Alertas")');
console.log('  · rocio@delcentro.com         — Rocío, agente dentro de la cuenta de Centro (para probar "Mi equipo")');
console.log('  · admin@safeinmuebles.com     — admin de la cuenta de Centro y además admin de la PLATAFORMA (ve "Panel Safe Inmuebles")');
console.log('  · julian@nortepropiedades.com — Norte Propiedades (socia de Centro, con 1 propiedad compartida ya aceptada, PRUEBA GRATIS en curso)');
console.log('  · camila@surbienesraices.com  — Sur Bienes Raíces (solicitud de sociedad pendiente hacia Centro, prueba gratis VENCIDA)');
console.log('  · lucia@agente.com            — Lucía Paz, agente independiente (socia de Centro, una alerta activa, suscripción CANCELADA)\n');
console.log('Nota sobre "Publicar en mi web": la casa de Nueva Córdoba (Centro) está');
console.log('compartida y aceptada con Norte (autorizada para su web: aparece en su feed');
console.log('y widget) y también con Lucía (solo uso interno: la puede ver y trabajar');
console.log('adentro del sistema, pero no autorizada para su web) — para comparar ambos');
console.log('casos entrando a esa propiedad como Marina.\n');
