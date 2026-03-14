import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('🔴 FATAL: DATABASE_URL no está configurada. Configurala en Railway → Variables.');
}

const connectionString = process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

export const pool = new pg.Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

pool.on('error', (err) => {
  console.error('🔴 Error en pool PostgreSQL:', String(err));
});

export const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error(`🔴 ---------------------------`);
    console.error(`🔴 ERROR EN DB QUERY:`);
    console.error(`🔴 Mensaje: ${err.message}`);
    if (process.env.NODE_ENV !== 'production') {
      console.error(`🔴 Query: ${text}`);
      console.error(`🔴 Params:`, params);
    }
    console.error(`🔴 ---------------------------`);
    throw err;
  }
};

export const testConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Conexión a PostgreSQL establecida correctamente.');
    return true;
  } catch (err) {
    console.error('🔴 FALLO conexión a PostgreSQL:', String(err));
    console.error('   DATABASE_URL =', process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/:([^@]+)@/, ':***@')
      : 'NO CONFIGURADA');
    return false;
  }
};

export default pool;
