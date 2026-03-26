import pg from 'pg';

async function checkDuplicates() {
    const pool = new pg.Pool({
        user: 'postgres',
        password: 'postgres',
        host: '127.0.0.1',
        port: 5432,
        database: 'voraz_db',
    });
    try {
        console.log('--- PRODUCT COUNTS PER CATEGORY (Top 10) ---');
        const res = await pool.query(`
            SELECT store_id, category_id, COUNT(*) as total 
            FROM products 
            GROUP BY store_id, category_id 
            HAVING COUNT(*) > 2
            ORDER BY total DESC 
            LIMIT 10
        `);
        console.table(res.rows);

        console.log('--- SAMPLE OF POTENTIAL NAME DUPLICATES ---');
        const dups = await pool.query(`
            SELECT store_id, name, category_id, COUNT(*) 
            FROM products 
            GROUP BY store_id, name, category_id 
            HAVING COUNT(*) > 1
            LIMIT 10
        `);
        console.table(dups.rows);

    } catch (e) {
        console.log('❌ ERROR:', e.message);
    } finally {
        await pool.end();
    }
}

checkDuplicates();
