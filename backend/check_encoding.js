import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://voraz_admin:voraz_password_secure@localhost:5433/voraz_db'
});

async function checkEncoding() {
    try {
        console.log('--- Database Encoding ---');
        const enc = await pool.query("SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname = current_database()");
        console.log('Encoding:', enc.rows[0].pg_encoding_to_char);

        console.log('\n--- Sample Products (Checking for garbled text) ---');
        const products = await pool.query("SELECT id, name, description FROM products LIMIT 10");
        products.rows.forEach(p => {
            console.log(`ID: ${p.id} | Name: ${p.name}`);
            console.log(`Description: ${p.description}`);
            console.log('---');
        });

        console.log('\n--- Sample Categories ---');
        const categories = await pool.query("SELECT id, name FROM categories LIMIT 10");
        categories.rows.forEach(c => {
            console.log(`ID: ${c.id} | Name: ${c.name}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkEncoding();
