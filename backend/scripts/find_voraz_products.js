import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

// Usando las credenciales de start-local.ps1
const pool = new Pool({
  user: 'voraz_admin',
  password: 'voraz_password_secure',
  host: 'localhost',
  port: 5433,
  database: 'voraz_db',
});

const findProducts = async () => {
    try {
        console.log('🔍 Buscando productos que contienen "Voraz" en voraz_db (puerto 5433)...');
        
        const query = `
            SELECT id, name, description, store_id 
            FROM products 
            WHERE name ILIKE '%voraz%' OR description ILIKE '%voraz%'
        `;
        
        const res = await pool.query(query);
        
        if (res.rows.length === 0) {
            console.log('✅ No se encontraron productos con la palabra "Voraz".');
        } else {
            console.log(`\n📋 Se encontraron ${res.rows.length} productos afectados:\n`);
            console.table(res.rows.map(row => ({
                ID: row.id,
                Nombre: row.name,
                'Store ID': row.store_id,
                'Contiene en': `${row.name.toLowerCase().includes('voraz') ? 'Nombre ' : ''}${row.description?.toLowerCase().includes('voraz') ? 'Descripción' : ''}`
            })));
        }
    } catch (error) {
        console.error('❌ Error al buscar productos:', error);
    } finally {
        await pool.end();
    }
};

findProducts();
