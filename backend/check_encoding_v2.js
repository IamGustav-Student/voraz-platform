import pg from 'pg';

const pool = new pg.Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'voraz_db',
    password: 'postgres',
    port: 5433,
});

async function checkEncoding() {
    try {
        console.log('--- Database Encoding ---');
        const dbEnc = await pool.query("SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname = current_database()");
        console.log('Database Encoding:', dbEnc.rows[0].pg_encoding_to_char);

        console.log('\n--- Client Encoding ---');
        const clientEnc = await pool.query("SHOW client_encoding");
        console.log('Client Encoding:', clientEnc.rows[0].client_encoding);

        console.log('\n--- Sample Data ---');
        const products = await pool.query("SELECT id, name FROM products WHERE name ILIKE '%á%' OR name ILIKE '%é%' OR name ILIKE '%í%' OR name ILIKE '%ó%' OR name ILIKE '%ú%' OR name ILIKE '%ñ%' LIMIT 5");
        products.rows.forEach(p => console.log(`ID: ${p.id} | Name: ${p.name}`));

        const categories = await pool.query("SELECT id, name FROM categories WHERE name ILIKE '%í%' OR name ILIKE '%á%' LIMIT 5");
        categories.rows.forEach(c => console.log(`ID: ${c.id} | Name: ${c.name}`));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkEncoding();
