import pg from 'pg';

const pool = new pg.Pool({
    user: 'voraz_admin',
    host: 'localhost',
    database: 'voraz_db',
    password: 'voraz_password_secure',
    port: 5433,
});

async function checkEncoding() {
    try {
        console.log('--- Database Encoding ---');
        const dbEnc = await pool.query("SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname = current_database()");
        console.log('Database Encoding:', dbEnc.rows[0].pg_encoding_to_char);

        console.log('\n--- Sample Products (Accents Check) ---');
        // Usamos una query que busque productos con caracteres especiales
        const res = await pool.query(`
            SELECT id, name, description 
            FROM products 
            WHERE name ~ '[áéíóúñÁÉÍÓÚÑ]' OR description ~ '[áéíóúñÁÉÍÓÚÑ]'
            LIMIT 10
        `);
        
        if (res.rows.length === 0) {
            console.log('No products with accents found in the first batch. Checking all...');
            const all = await pool.query("SELECT id, name FROM products LIMIT 20");
            all.rows.forEach(p => console.log(`ID: ${p.id} | Name: ${p.name}`));
        } else {
            res.rows.forEach(p => {
                console.log(`ID: ${p.id} | Name: ${p.name}`);
                console.log(`Desc: ${p.description}`);
                console.log('---');
            });
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkEncoding();
