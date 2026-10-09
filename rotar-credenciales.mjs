// rotar-credenciales.mjs
// Fase 0.5 del PLAN-SEGURIDAD.md — invalida credenciales que estuvieron expuestas.
//
//   --sesiones   Borra todas las sesiones: todos los usuarios tienen que volver a loguearse.
//   --api-keys   Genera una api_key nueva para cada inmobiliaria.
//                ⚠️ El widget/feed embebido en las webs de las inmobiliarias deja de
//                funcionar hasta que copien el código nuevo desde "Mi web".
//
// Sin --confirmar solo muestra lo que haría (modo prueba).
// Uso: node rotar-credenciales.mjs --sesiones --api-keys --confirmar
// En producción: configurar las mismas variables de entorno que usa el backend.

import 'dotenv/config';
import mysql from 'mysql2/promise';
import { randomBytes } from 'node:crypto';

const args = new Set(process.argv.slice(2));
const doSessions = args.has('--sesiones');
const doApiKeys = args.has('--api-keys');
const confirmed = args.has('--confirmar');

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME     || 'spiderconnect',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
});

async function main() {
  if (!doSessions && !doApiKeys) {
    console.log('Indicá qué rotar: --sesiones y/o --api-keys (agregá --confirmar para aplicar).');
    return;
  }
  const conn = await pool.getConnection();
  try {
    const [[{ sesiones }]] = await conn.query('SELECT COUNT(*) AS sesiones FROM sesiones');
    const [[{ agencias }]] = await conn.query('SELECT COUNT(*) AS agencias FROM inmobiliarias');

    console.log(confirmed ? 'MODO REAL' : 'MODO PRUEBA (no se modifica nada, usá --confirmar)');
    if (doSessions) console.log(`  Sesiones a eliminar           : ${sesiones}`);
    if (doApiKeys)  console.log(`  API keys de agencias a rotar  : ${agencias}`);
    if (!confirmed) return;

    await conn.beginTransaction();
    if (doSessions) {
      await conn.query('DELETE FROM sesiones');
    }
    if (doApiKeys) {
      const [rows] = await conn.query('SELECT id FROM inmobiliarias');
      for (const { id } of rows) {
        await conn.query('UPDATE inmobiliarias SET api_key=? WHERE id=?', [randomBytes(24).toString('hex'), id]);
      }
    }
    await conn.commit();
    console.log('');
    console.log('Listo.');
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw e;
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
