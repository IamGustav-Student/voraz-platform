import pg from 'pg';

const configs = [
  { user: 'postgres', port: 5432, password: 'postgres', database: 'voraz_db' },
  { user: 'postgres', port: 5433, password: 'postgres', database: 'voraz_db' },
  { user: 'voraz_admin', port: 5432, password: 'voraz_password_secure', database: 'voraz_db' },
  { user: 'voraz_admin', port: 5433, password: 'voraz_password_secure', database: 'voraz_db' },
  { user: 'postgres', port: 5432, password: 'postgres', database: 'postgres' },
  { user: 'voraz_admin', port: 5433, password: 'voraz_password_secure', database: 'postgres' },
];

async function testAll() {
  for (const config of configs) {
    const pool = new pg.Pool({ ...config, host: '127.0.0.1', connectionTimeoutMillis: 2000 });
    try {
      const client = await pool.connect();
      console.log(`✅ SUCCESS: ${config.user}@${config.port} on db ${config.database}`);
      client.release();
      await pool.end();
      process.exit(0);
    } catch (e) {
      console.log(`❌ FAIL: ${config.user}@${config.port} on db ${config.database} - ${e.message}`);
      await pool.end();
    }
  }
}

testAll();
