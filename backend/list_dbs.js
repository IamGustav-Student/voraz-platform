import pg from 'pg';

const pool = new pg.Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'postgres',
    port: 5433,
});

const listDbs = async () => {
    try {
        const res = await pool.query('SELECT datname FROM pg_database WHERE datistemplate = false');
        console.log('Bases de datos disponibles:');
        console.table(res.rows);
    } catch (error) {
        console.error('Error al listar bases de datos:', error);
    } finally {
        await pool.end();
    }
};

listDbs();
