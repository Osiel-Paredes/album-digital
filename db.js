// db.js
// Conexión a PostgreSQL. Usa la variable de entorno DATABASE_URL, que te
// da Railway/Render automáticamente. Para desarrollo local, cárgala desde
// un archivo .env (ver .env.example) apuntando a la MISMA base de datos
// en la nube — así no hace falta instalar Postgres en tu PC.

require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn(
    '⚠️  No se encontró DATABASE_URL. Crea un archivo .env con tu cadena de conexión de Postgres (ver .env.example).'
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // La mayoría de los hostings (Railway, Render, Supabase...) exigen SSL.
  // En una base local sin SSL, esto no estorba.
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false }
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS photos (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      title TEXT,
      note TEXT NOT NULL,
      date_taken DATE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

module.exports = { pool, initDb };
