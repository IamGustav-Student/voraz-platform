import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

export const pool = new pg.Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Listener para errores inesperados en el pool
pool.on('error', (err) => {
  console.error('🔴 Error inesperado en el cliente de PostgreSQL', err);
  process.exit(-1);
});

export const query = (text, params) => pool.query(text, params);
export default pool;