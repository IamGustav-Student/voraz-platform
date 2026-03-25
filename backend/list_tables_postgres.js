import pg from 'pg';

const pool = new pg.Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'postgres',
    port: 5433,
});

const listTables = async () => {
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tablas en public:');
        console.table(res.rows);
    } catch (error) {
        console.error('Error al listar tablas:', error);
    } finally {
        await pool.end();
    }
};

listTables();
