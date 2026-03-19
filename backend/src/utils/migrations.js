import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Automatizador de Migraciones de GastroRed
 * ----------------------------------------
 * Busca todos los archivos .sql en backend/src/db/, 
 * los ordena y los ejecuta uno por uno si no han sido ejecutados aún.
 */
// Lista de archivos que NUNCA deben ejecutarse automáticamente (destructivos o manuales)
const BLACKLIST = [
  'phase20_clean_tenants.sql', // Borra datos de comercios (Peligroso)
  'init.sql',                 // Ya ejecutado en la base inicial
];

function getPhaseNumber(filename) {
  const match = filename.match(/phase(\d+)/i);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Automatizador de Migraciones de GastroRed
 */
export async function runMigrations() {
  console.log('[MIGRATOR] Iniciando chequeo de migraciones...');

  try {
    // 1. Crear tabla de historial si no existe
    await query(`
      CREATE TABLE IF NOT EXISTS migrations_history (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. Leer archivos de la carpeta db
    const dbDir = path.join(__dirname, '..', 'db');
    if (!fs.existsSync(dbDir)) return;

    // Ordenar de forma natural (phase1, phase2... phase10, phase11...)
    const files = fs.readdirSync(dbDir)
      .filter(f => f.endsWith('.sql'))
      .sort((a, b) => {
        const numA = getPhaseNumber(a);
        const numB = getPhaseNumber(b);
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b); // Desempate alfabético
      });

    // 3. Obtener historial
    const { rows } = await query('SELECT filename FROM migrations_history');
    const executedFiles = new Set(rows.map(r => r.filename));

    // 4. Ejecutar las nuevas
    for (const file of files) {
      if (executedFiles.has(file)) continue;

      if (BLACKLIST.includes(file)) {
        console.warn(`[MIGRATOR] Saltando archivo en Blacklist: ${file}`);
        continue;
      }

      console.log(`[MIGRATOR] Ejecutando nueva migración: ${file}...`);
      const filePath = path.join(dbDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await query('BEGIN');
        await query(sql);
        await query('INSERT INTO migrations_history (filename) VALUES ($1)', [file]);
        await query('COMMIT');
        console.log(`[MIGRATOR] ✅ Migración ${file} completada.`);
      } catch (err) {
        await query('ROLLBACK');
        console.error(`[MIGRATOR] ❌ Error en ${file}:`, err.message);
        // Si es un error de "already exists", marcamos como ejecutada para no trabar el resto
        if (err.message.includes('already exists') || err.message.includes('already a primary key')) {
           console.log(`[MIGRATOR] Marcando ${file} como "pre-existente" para evitar bloqueos futuros.`);
           await query('INSERT INTO migrations_history (filename) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
        }
      }
    }
    console.log('[MIGRATOR] Chequeo finalizado.');
  } catch (error) {
    console.error('[MIGRATOR] Fallo crítico:', error.message);
  }
}
