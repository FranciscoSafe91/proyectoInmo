// seed-demo.js — dos agencias, una propiedad cada una, compartida pendiente entre sí.
// Correr con: node backend/src/seed-demo.js  (desde la raíz del proyecto)

import * as db from './db.js';
import * as auth from './auth.js';

const PASS = 'demo1234';

async function run() {
  await db.resetDatabase();

  // ── Agencia 1 ──
  const ag1 = await db.createAgency({
    name: 'Inmobiliaria Central',
    slug: 'inmobiliaria-central',
    email: 'contacto@central.com',
    phone: '351-111-0001',
    city: 'Córdoba',
  });
  const { hash: h1, salt: s1 } = auth.hashPassword(PASS);
  await db.createUser({
    agencyId: ag1.id,
    name: 'Ana García',
    email: 'ana@central.com',
    passwordHash: h1,
    passwordSalt: s1,
    role: 'admin',
  });

  // ── Agencia 2 ──
  const ag2 = await db.createAgency({
    name: 'Norte Propiedades',
    slug: 'norte-propiedades',
    email: 'hola@norte.com',
    phone: '351-222-0002',
    city: 'Córdoba',
  });
  const { hash: h2, salt: s2 } = auth.hashPassword(PASS);
  await db.createUser({
    agencyId: ag2.id,
    name: 'Carlos López',
    email: 'carlos@norte.com',
    passwordHash: h2,
    passwordSalt: s2,
    role: 'admin',
  });

  // ── Suscripciones activas para ambas ──
  const plan = await db.getPlan();
  await db.applySuccessfulPayment(ag1.id, { amount: plan.priceARS, currency: 'ARS', method: 'manual' });
  await db.applySuccessfulPayment(ag2.id, { amount: plan.priceARS, currency: 'ARS', method: 'manual' });

  // ── Sociedad aceptada entre ambas ──
  const p = await db.createPartnershipRequest({ fromAgencyId: ag1.id, toAgencyId: ag2.id });
  await db.respondPartnership(p.id, 'aceptada');

  // ── Propiedad de Agencia 1 ──
  const prop1 = await db.createProperty({
    agencyId: ag1.id,
    title: 'Casa con jardín en Nueva Córdoba',
    description: 'Amplia casa reciclada, luminosa, a metros del Parque Sarmiento. Cocina integrada, patio amplio y cochera cubierta. Apta crédito.',
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

  // ── Propiedad de Agencia 2 ──
  const prop2 = await db.createProperty({
    agencyId: ag2.id,
    title: 'Departamento 2 ambientes a estrenar',
    description: 'Edificio nuevo con amenities: piscina, SUM y gimnasio. Balcón con vista al parque. Cochera opcional. Expensas bajas.',
    operation: 'alquiler',
    type: 'departamento',
    price: 380000,
    currency: 'ARS',
    address: 'Bv. Chacabuco 850',
    city: 'Córdoba',
    province: 'Córdoba',
    bedrooms: 2,
    bathrooms: 1,
    areaM2: 65,
    status: 'publicada',
  });

  // ── Ag1 comparte su casa con Ag2 — pendiente de aceptar ──
  await db.createPropertyShare({
    propertyId: prop1.id,
    ownerAgencyId: ag1.id,
    targetAgencyId: ag2.id,
    percentage: 50,
  });

  // ── Ag2 comparte su depto con Ag1 — pendiente de aceptar ──
  await db.createPropertyShare({
    propertyId: prop2.id,
    ownerAgencyId: ag2.id,
    targetAgencyId: ag1.id,
    percentage: 40,
  });

  console.log('\n✔ Base de datos lista.\n');
  console.log('Usuarios (contraseña para ambos: demo1234)\n');
  console.log('  ana@central.com     → Inmobiliaria Central  (tiene el depto de Norte pendiente de aceptar)');
  console.log('  carlos@norte.com    → Norte Propiedades     (tiene la casa de Central pendiente de aceptar)\n');
  console.log('Flujo de prueba del modal:');
  console.log('  1. Entrá con cualquiera de los dos');
  console.log('  2. Andá a Invitaciones');
  console.log('  3. Hacé clic en el nombre de la propiedad para ver el modal con la casa');
  console.log('  4. Aceptá o rechazá desde el modal\n');
}

run().catch(e => { console.error(e); process.exit(1); });
