import pg from 'pg';

const pool = new pg.Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'postgres',
    port: 5433,
});

async function checkTables() {
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables in public:');
        console.table(res.rows);

        if (res.rows.some(r => r.table_name === 'products')) {
            console.log('\n--- Sample Products ---');
            const products = await pool.query("SELECT id, name FROM products LIMIT 5");
            products.rows.forEach(p => console.log(`ID: ${p.id} | Name: ${p.name}`));
        } else {
            console.log('\nNo "products" table found in "postgres" database.');
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkTables();
