import pg from 'pg';
import dotenv from 'dotenv';


// Cargar variables de entorno
dotenv.config();

const { Pool } = pg;

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Esta línea de abajo es OBLIGATORIA para Railway (SSL):
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Listener para errores inesperados en el pool
pool.on('error', (err) => {
  console.error('🔴 Error inesperado en el cliente de PostgreSQL', err);
  process.exit(-1);
});

export const query = (text, params) => pool.query(text, params);
export default pool;