import pg from 'pg';

const combos = [
    { user: 'voraz_admin', password: 'voraz_password_secure', database: 'voraz_db' },
    { user: 'postgres', password: 'postgres', database: 'voraz_db' },
    { user: 'postgres', password: 'admin', database: 'voraz_db' },
    { user: 'postgres', password: 'password', database: 'voraz_db' },
    { user: 'postgres', password: 'root', database: 'voraz_db' },
    { user: 'postgres', password: '', database: 'postgres' },
    { user: 'postgres', password: 'postgres', database: 'postgres' },
];

async function probe() {
    for (const c of combos) {
        console.log(`Probing: ${c.user}@localhost:5433/${c.database}...`);
        const pool = new pg.Pool({
            user: c.user,
            host: 'localhost',
            database: c.database,
            password: c.password,
            port: 5433,
            connectionTimeoutMillis: 2000,
        });
        try {
            const client = await pool.connect();
            console.log('✅ SUCCESS!');
            await client.query('SELECT 1');
            client.release();
            console.log(`\nFound valid credentials:\nUSER: ${c.user}\nPASS: ${c.password}\nDB: ${c.database}`);
            process.exit(0);
        } catch (e) {
            console.log(`❌ Failed: ${e.message}`);
        } finally {
            await pool.end();
        }
    }
    console.log('\nAll probes on 5433 failed.');
}

probe();
