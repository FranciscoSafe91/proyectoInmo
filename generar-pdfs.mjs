import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Colores y constantes ────────────────────────────────────────────────────
const VERDE       = '#1f6f54';
const VERDE_CLARO = '#e8f5ef';
const GRIS        = '#555555';
const GRIS_CLARO  = '#888888';
const NEGRO       = '#1a1a1a';
const ACENTO      = '#d98c2b';

function crearDoc(archivo) {
  const doc = new PDFDocument({ size: 'A4', margin: 55, info: { Author: 'SpiderConect Dev' } });
  doc.pipe(createWriteStream(join(__dirname, archivo)));
  return doc;
}

function lineaH(doc, color = '#dddddd') {
  doc.moveTo(55, doc.y).lineTo(doc.page.width - 55, doc.y).strokeColor(color).lineWidth(0.5).stroke();
  doc.moveDown(0.5);
}

function chip(doc, texto, color = VERDE) {
  const x = doc.x;
  const y = doc.y;
  const ancho = doc.widthOfString(texto) + 16;
  doc.roundedRect(x, y, ancho, 16, 4).fill(color);
  doc.fillColor('white').fontSize(8).font('Helvetica-Bold').text(texto, x + 8, y + 4, { lineBreak: false });
  doc.fillColor(NEGRO).font('Helvetica');
  doc.x = x;
  doc.moveDown(1.2);
}

function seccion(doc, titulo) {
  doc.moveDown(0.8);
  doc.rect(55, doc.y, doc.page.width - 110, 22).fill(VERDE_CLARO);
  doc.fillColor(VERDE).fontSize(11).font('Helvetica-Bold').text(titulo, 62, doc.y - 17);
  doc.fillColor(NEGRO).font('Helvetica');
  doc.moveDown(0.6);
}

function bullet(doc, texto, nivel = 0) {
  const indent = 65 + nivel * 16;
  const sym = nivel === 0 ? '▸' : '·';
  doc.fontSize(10).font('Helvetica').fillColor(GRIS)
    .text(sym, indent, doc.y, { continued: true, width: 12 });
  doc.fillColor(NEGRO).text(' ' + texto, { width: doc.page.width - indent - 55 });
}

function codeBlock(doc, lineas) {
  const alto = lineas.length * 14 + 16;
  doc.rect(55, doc.y, doc.page.width - 110, alto).fill('#f4f4f4');
  const startY = doc.y - alto + 8;
  doc.fillColor('#333333').fontSize(8.5).font('Courier');
  lineas.forEach((l, i) => {
    doc.text(l, 68, startY + i * 14, { lineBreak: false });
  });
  doc.font('Helvetica').fillColor(NEGRO);
  doc.moveDown(0.6);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF 1 — DIARIO DE DESARROLLO
// ═══════════════════════════════════════════════════════════════════════════════
async function generarDiario() {
  const doc = crearDoc('diario-de-desarrollo.pdf');

  // ── Portada / encabezado ──
  doc.rect(0, 0, doc.page.width, 110).fill(VERDE);
  doc.fillColor('white').fontSize(26).font('Helvetica-Bold')
    .text('SpiderConect', 55, 28, { lineBreak: false });
  doc.fontSize(13).font('Helvetica')
    .text('Diario de Desarrollo', 55, 60, { lineBreak: false });
  doc.fontSize(20).font('Helvetica-Bold')
    .text('Día 1', doc.page.width - 130, 38, { lineBreak: false });
  doc.fillColor(VERDE_CLARO).fontSize(10).font('Helvetica')
    .text('1 de septiembre de 2026', doc.page.width - 185, 65, { lineBreak: false });

  doc.fillColor(NEGRO).y = 130;
  doc.moveDown(0);

  // ── Resumen ejecutivo ──
  doc.fontSize(10).font('Helvetica').fillColor(GRIS)
    .text('Primer día de desarrollo del sistema SpiderConect. Se realizó la conversión completa del prototipo Node.js SSR a una arquitectura React + API REST + PostgreSQL, sentando las bases del producto.', { width: doc.page.width - 110 });
  doc.moveDown(0.8);
  lineaH(doc);

  // ── HITO 1 ──
  seccion(doc, '🚀  HITO 1 — Conversión a React + Vite');
  bullet(doc, 'Se migró el proyecto original (Node.js con HTML renderizado en servidor) a React 18 + Vite 5.');
  bullet(doc, 'El backend pasó a ser una API REST pura en JSON (puerto 3001).');
  bullet(doc, 'El frontend React corre en puerto 5173 con proxy Vite hacia el backend.');
  bullet(doc, 'Se implementó React Router v6 con rutas protegidas (PrivateRoute / PublicOnly).');
  bullet(doc, 'Sistema de autenticación con cookies HttpOnly, sesiones y scrypt para contraseñas.');
  doc.moveDown(0.4);

  // ── HITO 2 ──
  seccion(doc, '🎨  HITO 2 — Tailwind CSS + Diseño Responsive');
  bullet(doc, 'Se integró Tailwind CSS v3 manteniendo 100% del diseño visual original.');
  bullet(doc, 'Todos los estilos CSS originales se migraron a @layer components dentro de Tailwind.');
  bullet(doc, 'Responsive implementado para celular (< 640px), tablet (640-767px) y desktop.');
  bullet(doc, 'Navbar con menú hamburguesa (☰) en mobile mediante useState de React.');
  bullet(doc, 'Tablas con scroll horizontal en mobile usando la clase .table-wrap.');
  doc.moveDown(0.4);

  // ── HITO 3 ──
  seccion(doc, '📋  HITO 3 — Página de Registro');
  bullet(doc, 'Se creó la página de registro con los siguientes campos:');
  bullet(doc, 'Nombre, Apellido, Documento, Email (datos personales)', 1);
  bullet(doc, 'Tipo de cuenta (Inmobiliaria / Agente independiente), Nombre, Dirección', 1);
  bullet(doc, 'Username, Contraseña, Confirmación de contraseña (datos de acceso)', 1);
  bullet(doc, 'Checkbox de términos y condiciones obligatorio', 1);
  bullet(doc, 'Botones Crear cuenta y Cancelar', 1);
  bullet(doc, 'Validación client-side: contraseñas coincidentes, mínimo 6 caracteres, términos aceptados.');
  doc.moveDown(0.4);

  // ── HITO 4 ──
  seccion(doc, '🗄️  HITO 4 — Integración PostgreSQL');
  bullet(doc, 'Se instaló el driver pg (node-postgres) en el backend.');
  bullet(doc, 'Se creó la conexión al servidor PostgreSQL: localhost:5432, base spiderconnect.');
  bullet(doc, 'El formulario de registro guarda los datos en la tabla usuarios de PostgreSQL.');
  bullet(doc, 'El login verifica email y contraseña contra la base de datos PostgreSQL.');
  bullet(doc, 'Se agregó modal "¿Olvidaste tu contraseña?" que verifica si el email está registrado.');
  doc.moveDown(0.4);

  // ── HITO 5 (principal del día) ──
  seccion(doc, '⭐  HITO 5 — Migración Total a PostgreSQL');
  bullet(doc, 'Se eliminó completamente el archivo db.json como fuente de datos.');
  bullet(doc, 'Se diseñaron y crearon 11 tablas en PostgreSQL:');
  const tablas = ['usuarios', 'inmobiliarias', 'sesiones', 'propiedades', 'sociedades', 'compartidas', 'alertas_busqueda', 'plan_suscripcion', 'suscripciones', 'pagos', 'invitaciones', 'tickets_soporte'];
  tablas.forEach(t => bullet(doc, t, 1));
  bullet(doc, 'Las funciones de db.js se reescribieron como async/await usando pool de conexiones.');
  bullet(doc, 'auth.js se actualizó para consultas asíncronas a PostgreSQL.');
  bullet(doc, 'api.js se actualizó completamente: todas las rutas ahora usan await.');
  doc.moveDown(0.4);

  // ── Decisiones técnicas ──
  seccion(doc, '🔧  Decisiones Técnicas del Día');

  doc.fontSize(10).font('Helvetica-Bold').fillColor(NEGRO).text('¿Por qué Tailwind en lugar de CSS puro?');
  doc.font('Helvetica').fillColor(GRIS).fontSize(9.5)
    .text('Tailwind permite diseño responsive sin romper los estilos existentes. Al usar @layer components, las clases CSS originales (.card, .btn, .badge-*) siguen funcionando sin cambiar el JSX.', { width: doc.page.width - 110 });
  doc.moveDown(0.5);

  doc.fontSize(10).font('Helvetica-Bold').fillColor(NEGRO).text('¿Por qué scrypt para contraseñas?');
  doc.font('Helvetica').fillColor(GRIS).fontSize(9.5)
    .text('scrypt es nativo de Node.js (sin dependencias extra), es resistente a ataques de fuerza bruta por su alto costo computacional, y usa salt único por usuario para que el mismo password produzca hashes distintos.', { width: doc.page.width - 110 });
  doc.moveDown(0.5);

  doc.fontSize(10).font('Helvetica-Bold').fillColor(NEGRO).text('¿Por qué separar frontend y backend en puertos distintos?');
  doc.font('Helvetica').fillColor(GRIS).fontSize(9.5)
    .text('Permite desplegar cada parte independientemente, facilita el desarrollo en paralelo y sigue la arquitectura estándar de SPAs modernas. Vite maneja el proxy en desarrollo.', { width: doc.page.width - 110 });
  doc.moveDown(0.8);
  lineaH(doc);

  // ── Próximos pasos ──
  doc.fontSize(11).font('Helvetica-Bold').fillColor(VERDE).text('📅  Próximos Pasos');
  doc.moveDown(0.4);
  bullet(doc, 'Implementar recuperación de contraseña por email (SMTP / SendGrid).');
  bullet(doc, 'Agregar carga de imágenes a propiedades.');
  bullet(doc, 'Panel de métricas avanzado para administradores.');
  bullet(doc, 'Tests automatizados (unitarios e integración).');
  bullet(doc, 'Dockerizar el stack para facilitar el despliegue.');

  doc.moveDown(1.5);
  lineaH(doc, VERDE);
  doc.fontSize(8.5).fillColor(GRIS_CLARO).font('Helvetica')
    .text('SpiderConect — Diario de Desarrollo Día 1 — 01/09/2026', { align: 'center' });

  doc.end();
  console.log('✅  diario-de-desarrollo.pdf generado');
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF 2 — GUÍA DEL CÓDIGO
// ═══════════════════════════════════════════════════════════════════════════════
async function generarGuia() {
  const doc = crearDoc('guia-del-codigo.pdf');

  // ── Portada ──
  doc.rect(0, 0, doc.page.width, 110).fill(ACENTO);
  doc.fillColor('white').fontSize(24).font('Helvetica-Bold').text('SpiderConect', 55, 24);
  doc.fontSize(16).font('Helvetica').text('Guía del Código — Cómo funciona el sistema', 55, 55);
  doc.fillColor('#fff9f0').fontSize(9.5).text('Documento de aprendizaje técnico', 55, 78);

  doc.fillColor(NEGRO).y = 130;
  doc.moveDown(0);

  doc.fontSize(10).font('Helvetica').fillColor(GRIS)
    .text('Esta guía explica cómo está construido SpiderConect, qué hace cada parte del código y por qué se tomaron esas decisiones. Está pensada para que puedas entender el sistema mientras lo desarrollás.', { width: doc.page.width - 110 });
  doc.moveDown(0.8);
  lineaH(doc);

  // ── 1. Arquitectura General ──
  seccion(doc, '1.  Arquitectura General del Sistema');
  doc.fontSize(10).font('Helvetica').fillColor(NEGRO)
    .text('SpiderConect está dividido en dos partes que se comunican entre sí:', { width: doc.page.width - 110 });
  doc.moveDown(0.4);
  codeBlock(doc, [
    '  NAVEGADOR (React)          SERVIDOR (Node.js)          BASE DE DATOS',
    '  Puerto 5173        ←→      Puerto 3001         ←→      PostgreSQL :5432',
    '  Vite + React 18            API REST (JSON)             spiderconnect',
  ]);
  bullet(doc, 'Frontend: lo que el usuario ve (React). Vive en el navegador.');
  bullet(doc, 'Backend: procesa las peticiones y accede a la base de datos.');
  bullet(doc, 'Base de datos: guarda toda la información de forma permanente.');
  doc.moveDown(0.4);

  // ── 2. Frontend ──
  seccion(doc, '2.  Frontend — React + Vite');

  doc.fontSize(10).font('Helvetica-Bold').fillColor(NEGRO).text('¿Qué es React?');
  doc.font('Helvetica').fillColor(GRIS).fontSize(9.5)
    .text('Una librería JavaScript que divide la pantalla en "componentes" reutilizables. Cada componente es una función que devuelve HTML (llamado JSX). Cuando los datos cambian, React actualiza solo la parte de la pantalla afectada, sin recargar la página.', { width: doc.page.width - 110 });
  doc.moveDown(0.5);

  doc.fontSize(10).font('Helvetica-Bold').fillColor(NEGRO).text('Estructura de archivos del frontend:');
  doc.moveDown(0.3);
  codeBlock(doc, [
    '  frontend/src/',
    '  ├── App.jsx          → Define todas las rutas (qué página mostrar según la URL)',
    '  ├── api.js           → Funciones para hablar con el backend (fetch)',
    '  ├── style.css        → Estilos globales + clases de Tailwind',
    '  ├── contexts/',
    '  │   └── AuthContext.jsx  → Maneja si el usuario está logueado o no',
    '  └── pages/',
    '      ├── Login.jsx    → Formulario de ingreso',
    '      ├── Register.jsx → Formulario de registro',
    '      ├── Dashboard.jsx → Pantalla principal post-login',
    '      └── ...          → Una página por sección del sistema',
  ]);

  doc.fontSize(10).font('Helvetica-Bold').fillColor(NEGRO).text('¿Cómo funciona el enrutamiento?');
  doc.font('Helvetica').fillColor(GRIS).fontSize(9.5)
    .text('React Router v6 controla qué componente mostrar según la URL. No hay recarga de página — es una SPA (Single Page Application). Las rutas están protegidas:', { width: doc.page.width - 110 });
  doc.moveDown(0.3);
  codeBlock(doc, [
    '  PrivateRoute  → Solo accesible si estás logueado (redirige a /login si no)',
    '  PublicOnly    → Solo accesible si NO estás logueado (redirige a /dashboard si sí)',
  ]);
  doc.moveDown(0.3);

  doc.fontSize(10).font('Helvetica-Bold').fillColor(NEGRO).text('¿Cómo sabe el frontend si estoy logueado?');
  doc.font('Helvetica').fillColor(GRIS).fontSize(9.5)
    .text('Al cargar la app, AuthContext hace una llamada al backend (/api/session). Si hay una cookie de sesión válida, el backend responde con los datos del usuario y la agencia. Ese estado se comparte con toda la app via useContext.', { width: doc.page.width - 110 });
  doc.moveDown(0.6);

  // ── 3. Backend ──
  seccion(doc, '3.  Backend — Node.js + API REST');

  doc.fontSize(10).font('Helvetica-Bold').fillColor(NEGRO).text('¿Qué es una API REST?');
  doc.font('Helvetica').fillColor(GRIS).fontSize(9.5)
    .text('Es un servidor que escucha peticiones HTTP y responde con datos en formato JSON. El frontend "pide" datos con fetch() y el backend los busca en PostgreSQL y los devuelve. Todo el HTML lo genera React, el backend solo maneja datos.', { width: doc.page.width - 110 });
  doc.moveDown(0.5);

  doc.fontSize(10).font('Helvetica-Bold').fillColor(NEGRO).text('Estructura de archivos del backend:');
  doc.moveDown(0.3);
  codeBlock(doc, [
    '  backend/src/',
    '  ├── server.js    → Servidor HTTP puro de Node.js. Escucha el puerto 3001.',
    '  ├── api.js       → Define todas las rutas de la API (/api/login, /api/propiedades...)',
    '  ├── db.js        → Todas las consultas SQL a PostgreSQL (SELECT, INSERT, UPDATE)',
    '  ├── auth.js      → Maneja sesiones, cookies y verificación de contraseñas',
    '  ├── pgPool.js    → Conexión al servidor PostgreSQL (pool de conexiones)',
    '  └── router.js    → Mini-router HTTP que hace el match de rutas',
  ]);

  doc.fontSize(10).font('Helvetica-Bold').fillColor(NEGRO).text('¿Cómo llega una petición del frontend al backend?');
  doc.moveDown(0.3);
  codeBlock(doc, [
    '  1. React llama a api.post("/login", {email, password})',
    '  2. Vite proxy redirige la llamada a http://localhost:3001/api/login',
    '  3. server.js recibe la petición HTTP',
    '  4. router.js busca qué función manejar según el método y la URL',
    '  5. api.js ejecuta la función correspondiente',
    '  6. db.js consulta PostgreSQL',
    '  7. El resultado se devuelve como JSON al frontend',
  ]);
  doc.moveDown(0.3);

  // ── 4. Base de Datos ──
  seccion(doc, '4.  Base de Datos — PostgreSQL');

  doc.fontSize(10).font('Helvetica').fillColor(GRIS)
    .text('PostgreSQL es el motor de base de datos. Guarda toda la información de forma persistente (no se pierde al reiniciar el servidor). El sistema usa 12 tablas:', { width: doc.page.width - 110 });
  doc.moveDown(0.4);
  codeBlock(doc, [
    '  usuarios         → Personas registradas (email, contraseña, nombre, rol)',
    '  inmobiliarias    → Cada agencia/inmobiliaria registrada',
    '  sesiones         → Tokens de sesión activos (quién está logueado)',
    '  propiedades      → Propiedades cargadas por las inmobiliarias',
    '  sociedades       → Vínculos de socios entre inmobiliarias',
    '  compartidas      → Propiedades compartidas entre socios',
    '  alertas_busqueda → Búsquedas guardadas para matchear propiedades',
    '  suscripciones    → Estado de la suscripción de cada inmobiliaria',
    '  pagos            → Historial de pagos',
    '  invitaciones     → Links para invitar agentes al equipo',
    '  tickets_soporte  → Consultas enviadas al equipo de SpiderConect',
    '  plan_suscripcion → El plan mensual (precio y nombre)',
  ]);
  doc.moveDown(0.3);

  // ── 5. Autenticación ──
  seccion(doc, '5.  Cómo Funciona la Autenticación');

  doc.fontSize(10).font('Helvetica-Bold').fillColor(NEGRO).text('Al registrarse:');
  doc.moveDown(0.3);
  codeBlock(doc, [
    '  1. El usuario llena el formulario y hace clic en "Crear cuenta"',
    '  2. React envía los datos al backend con POST /api/registro',
    '  3. Backend genera un salt aleatorio (32 caracteres) con crypto.randomBytes',
    '  4. Aplica scryptSync(contraseña + salt) → produce el hash (128 caracteres)',
    '  5. Guarda en PostgreSQL: nombre, email, hash, salt (NUNCA la contraseña)',
    '  6. Crea una sesión (token UUID) en la tabla sesiones',
    '  7. Devuelve el token en una cookie HttpOnly (el JS no puede leerla, más seguro)',
  ]);

  doc.fontSize(10).font('Helvetica-Bold').fillColor(NEGRO).text('Al iniciar sesión:');
  doc.moveDown(0.3);
  codeBlock(doc, [
    '  1. Usuario ingresa email + contraseña',
    '  2. Backend busca el usuario en PostgreSQL por email',
    '  3. Toma el salt guardado y aplica scryptSync(contraseña_ingresada + salt)',
    '  4. Compara el resultado con el hash guardado (comparación en tiempo constante)',
    '  5. Si coinciden → crea sesión y devuelve cookie. Si no → error 401.',
  ]);

  doc.fontSize(10).font('Helvetica-Bold').fillColor(NEGRO).text('En cada petición protegida:');
  doc.moveDown(0.3);
  codeBlock(doc, [
    '  1. El navegador envía automáticamente la cookie con cada petición',
    '  2. requireSession() lee el token de la cookie',
    '  3. Busca el token en la tabla sesiones → obtiene el user_id',
    '  4. Busca el usuario en la tabla usuarios → obtiene sus datos',
    '  5. Busca la inmobiliaria en inmobiliarias → obtiene su agencia',
    '  6. Si todo existe → deja pasar. Si falta algo → error 401.',
  ]);
  doc.moveDown(0.4);

  // ── 6. Pool de Conexiones ──
  seccion(doc, '6.  Pool de Conexiones a PostgreSQL');

  doc.fontSize(10).font('Helvetica').fillColor(GRIS)
    .text('Un pool de conexiones mantiene varias conexiones abiertas con PostgreSQL en lugar de abrir y cerrar una nueva conexión por cada petición. Esto mejora mucho el rendimiento.', { width: doc.page.width - 110 });
  doc.moveDown(0.4);
  codeBlock(doc, [
    '  // pgPool.js',
    '  const pool = new Pool({ host: "localhost", port: 5432,',
    '    database: "spiderconnect", user: "postgres", password: "root", max: 10 })',
    '',
    '  // Uso en db.js:',
    '  const { rows } = await pool.query("SELECT * FROM usuarios WHERE email=$1", [email])',
    '  // $1 es un parámetro preparado → previene inyección SQL',
  ]);

  doc.fontSize(10).font('Helvetica-Bold').fillColor(NEGRO).text('¿Qué es la inyección SQL y cómo se previene?');
  doc.font('Helvetica').fillColor(GRIS).fontSize(9.5)
    .text('Si armamos la query concatenando strings, un atacante puede escribir codigo SQL en el campo y tomar control de la base. Los parametros preparados ($1, $2...) evitan esto porque PostgreSQL trata el valor como dato, nunca como codigo SQL.', { width: doc.page.width - 110 });
  doc.moveDown(0.6);

  // ── 7. Flujo completo de una propiedad ──
  seccion(doc, '7.  Flujo Completo: Compartir una Propiedad');

  doc.fontSize(10).font('Helvetica').fillColor(GRIS)
    .text('Para que quede claro cómo interactúan todas las partes, veamos qué pasa cuando la Inmobiliaria A comparte una propiedad con la Inmobiliaria B:', { width: doc.page.width - 110 });
  doc.moveDown(0.3);
  codeBlock(doc, [
    '  1. A va a "Mis Propiedades" → el frontend llama GET /api/propiedades',
    '  2. db.js ejecuta: SELECT * FROM propiedades WHERE agency_id=$1',
    '  3. A elige con quién compartir (B debe ser socio)',
    '  4. Frontend llama POST /api/propiedades/:id/compartir {targetAgencyIds: [B.id]}',
    '  5. Backend verifica sociedad: SELECT 1 FROM sociedades WHERE status=aceptada AND...',
    '  6. Si son socios: INSERT INTO compartidas (property_id, owner_agency_id, target_agency_id)',
    '  7. B ve la notificación en "Invitaciones" → acepta',
    '  8. UPDATE compartidas SET status=aceptada WHERE id=$1',
    '  9. La propiedad aparece en "Compartidas conmigo" de B',
  ]);
  doc.moveDown(0.4);

  // ── 8. Conceptos clave ──
  seccion(doc, '8.  Glosario de Conceptos Clave');

  const glosario = [
    ['async/await', 'Sintaxis de JavaScript para manejar operaciones que tardan tiempo (como consultas a BD) sin bloquear el servidor. await pausa la función hasta que la consulta termina.'],
    ['Cookie HttpOnly', 'Dato guardado en el navegador que el servidor puede leer pero el JavaScript de la página no puede acceder. Más seguro para tokens de sesión.'],
    ['UUID', 'Identificador único universal (ej: "a3f8c12b-9e4d-..."). Se usa como ID de cada registro para que no sean predecibles.'],
    ['Middleware', 'Función que se ejecuta antes del handler principal. En este sistema, requireSession actúa como middleware de autenticación.'],
    ['Pool de conexiones', 'Conjunto de conexiones preabiertas a la BD para reutilizar. Evita el costo de abrir una nueva conexión TCP por cada petición.'],
    ['SPA', 'Single Page Application: la página no se recarga al navegar. React Router cambia lo que se muestra sin hacer un nuevo request al servidor.'],
    ['CORS', 'Cross-Origin Resource Sharing: política de seguridad que controla qué dominios pueden hacer peticiones a la API. Configurado para permitir solo localhost:5173.'],
  ];

  glosario.forEach(([term, def]) => {
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor(VERDE).text(term + '  ', { continued: true });
    doc.font('Helvetica').fillColor(GRIS).text(def, { width: doc.page.width - 110 });
    doc.moveDown(0.3);
  });

  doc.moveDown(1);
  lineaH(doc, ACENTO);
  doc.fontSize(8.5).fillColor(GRIS_CLARO).font('Helvetica')
    .text('SpiderConect — Guía del Código — Documento de aprendizaje técnico — 01/09/2026', { align: 'center' });

  doc.end();
  console.log('✅  guia-del-codigo.pdf generado');
}

// ── Ejecutar ambos ──
Promise.all([generarDiario(), generarGuia()])
  .then(() => console.log('\n📁  Los PDFs fueron generados en la carpeta del proyecto.\n'))
  .catch(e => { console.error('Error:', e); process.exit(1); });
