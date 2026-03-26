import pg from 'pg';

const pool = new pg.Pool({
    user: 'voraz_admin',
    host: 'localhost',
    database: 'voraz_db',
    password: 'voraz_password_secure',
    port: 5432,
});

async function checkTables() {
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables in public (Port 5432):');
        console.table(res.rows);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkTables();
