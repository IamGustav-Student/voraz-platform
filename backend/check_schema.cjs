const { Client } = require('pg');

async function run() {
    const client = new Client({
        user: 'voraz_admin',
        password: 'voraz_password_secure',
        host: 'localhost',
        port: 5433,
        database: 'voraz_db'
    });

    try {
        await client.connect();

        // Check stores table columns
        const res1 = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'stores';
    `);
        console.log("stores table columns:");
        console.table(res1.rows);

        // Check users table columns
        const res2 = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
        console.log("users table columns:");
        console.table(res2.rows);

    } catch (e) {
        console.error("DB error:", e);
    } finally {
        await client.end();
    }
}

run();
