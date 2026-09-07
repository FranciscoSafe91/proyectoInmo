// seed_test_users.js — 5 agencias independientes con 10 propiedades cada una.
// Correr con: node src/seed_test_users.js
// NO resetea la base — solo agrega los datos de prueba.

import 'dotenv/config';
import * as db from './db.js';
import { hashPassword } from './auth.js';

const PASSWORD = 'Test1234';

const USERS = [
  {
    agencyName: 'Mendez Propiedades',
    agencySlug: 'mendez-propiedades',
    agencyEmail: 'contacto@mendezprop.com',
    agencyCity: 'Córdoba',
    adminName: 'Carlos Méndez',
    adminEmail: 'carlos@mendezprop.com',
  },
  {
    agencyName: 'Torres Real Estate',
    agencySlug: 'torres-real-estate',
    agencyEmail: 'info@torresre.com',
    agencyCity: 'Buenos Aires',
    adminName: 'Valentina Torres',
    adminEmail: 'valentina@torresre.com',
  },
  {
    agencyName: 'Giménez & Asociados',
    agencySlug: 'gimenez-asociados',
    agencyEmail: 'contacto@gimenez.com',
    agencyCity: 'Rosario',
    adminName: 'Roberto Giménez',
    adminEmail: 'roberto@gimenez.com',
  },
  {
    agencyName: 'Herrera Inmuebles',
    agencySlug: 'herrera-inmuebles',
    agencyEmail: 'info@herrerainmuebles.com',
    agencyCity: 'Mendoza',
    adminName: 'Sofía Herrera',
    adminEmail: 'sofia@herrerainmuebles.com',
  },
  {
    agencyName: 'Ramos Propiedades',
    agencySlug: 'ramos-propiedades',
    agencyEmail: 'ventas@ramosprop.com',
    agencyCity: 'Tucumán',
    adminName: 'Diego Ramos',
    adminEmail: 'diego@ramosprop.com',
  },
];

// 10 propiedades distintas por agencia
function buildProperties(agencyId, userId, cityName) {
  return [
    {
      agencyId, createdByUserId: userId,
      title: `Casa 3 ambientes con jardín en ${cityName}`,
      description: 'Amplia casa luminosa con jardín, patio y garage. Ideal para familia. Apta crédito.',
      operation: 'venta', type: 'casa', price: 135000, currency: 'USD',
      address: 'Av. San Martín 1234', city: cityName, province: cityName,
      bedrooms: 3, bathrooms: 2, areaM2: 180, status: 'publicada',
    },
    {
      agencyId, createdByUserId: userId,
      title: `Departamento 2 ambientes a estrenar en ${cityName}`,
      description: 'Edificio nuevo, amenities completos. Cochera opcional. Excelente ubicación.',
      operation: 'alquiler', type: 'departamento', price: 320000, currency: 'ARS',
      address: 'Bv. Rivadavia 850', city: cityName, province: cityName,
      bedrooms: 1, bathrooms: 1, areaM2: 55, status: 'publicada',
    },
    {
      agencyId, createdByUserId: userId,
      title: `Terreno de esquina en ${cityName}`,
      description: 'Terreno de 500 m² con todos los servicios. Ideal para desarrollo.',
      operation: 'venta', type: 'terreno', price: 55000, currency: 'USD',
      address: 'Calle Los Robles s/n', city: cityName, province: cityName,
      bedrooms: 0, bathrooms: 0, areaM2: 500, status: 'publicada',
    },
    {
      agencyId, createdByUserId: userId,
      title: `PH 4 ambientes con terraza en ${cityName}`,
      description: 'PH con terraza propia, parrilla y vistas al parque. Muy luminoso.',
      operation: 'venta', type: 'ph', price: 175000, currency: 'USD',
      address: 'Calle Belgrano 567', city: cityName, province: cityName,
      bedrooms: 3, bathrooms: 2, areaM2: 140, status: 'publicada',
    },
    {
      agencyId, createdByUserId: userId,
      title: `Local comercial en zona céntrica de ${cityName}`,
      description: 'Local en planta baja, vidriera doble, baño, depósito. Alta circulación peatonal.',
      operation: 'alquiler', type: 'local', price: 280000, currency: 'ARS',
      address: 'Av. Colón 321', city: cityName, province: cityName,
      bedrooms: 0, bathrooms: 1, areaM2: 80, status: 'publicada',
    },
    {
      agencyId, createdByUserId: userId,
      title: `Oficina en piso ejecutivo en ${cityName}`,
      description: 'Piso 8, vista panorámica, aire acondicionado, cocina equipada.',
      operation: 'alquiler', type: 'oficina', price: 420000, currency: 'ARS',
      address: 'Pasaje Gral. Paz 100', city: cityName, province: cityName,
      bedrooms: 0, bathrooms: 1, areaM2: 65, status: 'publicada',
    },
    {
      agencyId, createdByUserId: userId,
      title: `Casa en barrio privado de ${cityName}`,
      description: 'Casa moderna en country, 4 ambientes, pileta, seguridad 24hs.',
      operation: 'venta', type: 'casa', price: 280000, currency: 'USD',
      address: 'Los Pinos Country Club', city: cityName, province: cityName,
      bedrooms: 4, bathrooms: 3, areaM2: 240, status: 'publicada',
    },
    {
      agencyId, createdByUserId: userId,
      title: `Cochera cubierta en edificio de ${cityName}`,
      description: 'Cochera amplia apta para auto grande, acceso con tarjeta. Muy segura.',
      operation: 'venta', type: 'cochera', price: 15000, currency: 'USD',
      address: 'Bv. Illia 400', city: cityName, province: cityName,
      bedrooms: 0, bathrooms: 0, areaM2: 18, status: 'publicada',
    },
    {
      agencyId, createdByUserId: userId,
      title: `Departamento temporario en ${cityName}`,
      description: 'Depto amoblado para alquiler temporario, totalmente equipado. Mínimo 7 días.',
      operation: 'alquiler_temporario', type: 'departamento', price: 8500, currency: 'ARS',
      address: 'Calle Tucumán 789', city: cityName, province: cityName,
      bedrooms: 2, bathrooms: 1, areaM2: 70, status: 'publicada',
    },
    {
      agencyId, createdByUserId: userId,
      title: `Galpón industrial en ${cityName}`,
      description: 'Galpón 600 m², portón 4m alto, piso de cemento reforzado, oficina interna.',
      operation: 'alquiler', type: 'galpon', price: 650000, currency: 'ARS',
      address: 'Ruta 9 km 12', city: cityName, province: cityName,
      bedrooms: 0, bathrooms: 1, areaM2: 600, status: 'publicada',
    },
  ];
}

async function main() {
  console.log('\n Creando usuarios y propiedades de prueba...\n');

  const createdUsers = [];

  for (const data of USERS) {
    // Crear agencia
    const agency = await db.createAgency({
      name: data.agencyName,
      slug: data.agencySlug,
      email: data.agencyEmail,
      phone: '',
      city: data.agencyCity,
    });

    // Crear admin de la agencia
    const { hash, salt } = hashPassword(PASSWORD);
    const user = await db.createUser({
      agencyId: agency.id,
      name: data.adminName,
      email: data.adminEmail,
      passwordHash: hash,
      passwordSalt: salt,
      role: 'admin',
    });

    // Crear 10 propiedades
    const props = buildProperties(agency.id, user.id, data.agencyCity);
    for (const prop of props) {
      await db.createProperty(prop);
    }

    createdUsers.push({ name: data.adminName, email: data.adminEmail, agency: data.agencyName });
    console.log(`  ✔ ${data.adminName} (${data.agencyName}) — 10 propiedades creadas`);
  }

  console.log('\n ✔ Listo. Usuarios creados (contraseña para todos: ' + PASSWORD + '):\n');
  console.log('  Usuario                         Email                              Agencia');
  console.log('  ' + '─'.repeat(85));
  for (const u of createdUsers) {
    console.log(`  ${u.name.padEnd(32)}${u.email.padEnd(35)}${u.agency}`);
  }
  console.log('');

  process.exit(0);
}

main().catch((err) => {
  console.error('\n Error:', err.message);
  process.exit(1);
});
