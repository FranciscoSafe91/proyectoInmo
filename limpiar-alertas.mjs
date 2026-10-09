// limpiar-alertas.mjs
// Elimina SOLO alertas y match_requests. No toca usuarios ni propiedades.
// Uso: node limpiar-alertas.mjs
// En producción: configurar las mismas variables de entorno que usa el backend.

import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME     || 'spiderconnect',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
});

async function main() {
  const conn = await pool.getConnection();
  try {
    const [[{ alertas }]] = await conn.query('SELECT COUNT(*) AS alertas FROM alertas_busqueda');
    const [[{ matches }]] = await conn.query('SELECT COUNT(*) AS matches FROM match_requests').catch(() => [[ { matches: 0 } ]]);

    console.log(`Registros encontrados:`);
    console.log(`  alertas_busqueda : ${alertas}`);
    console.log(`  match_requests   : ${matches}`);
    console.log('');

    if (alertas === 0 && matches === 0) {
      console.log('Nada que eliminar. Saliendo.');
      return;
    }

    console.log('Eliminando match_requests...');
    await conn.query('DELETE FROM match_requests');

    console.log('Eliminando alertas_busqueda...');
    await conn.query('DELETE FROM alertas_busqueda');

    const [[{ r1 }]] = await conn.query('SELECT COUNT(*) AS r1 FROM alertas_busqueda');
    const [[{ r2 }]] = await conn.query('SELECT COUNT(*) AS r2 FROM match_requests').catch(() => [[ { r2: 0 } ]]);
    console.log('');
    console.log(`Listo. Registros restantes:`);
    console.log(`  alertas_busqueda : ${r1}`);
    console.log(`  match_requests   : ${r2}`);
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
