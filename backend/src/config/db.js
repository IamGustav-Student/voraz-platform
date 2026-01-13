import pg from 'pg';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Listener para errores inesperados en el pool
pool.on('error', (err) => {
  console.error('🔴 Error inesperado en el cliente de PostgreSQL', err);
  process.exit(-1);
});

export const query = (text, params) => pool.query(text, params);
export default pool;