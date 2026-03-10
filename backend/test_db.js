import { query } from './src/config/db.js';

async function check() {
    try {
        const r = await query("SELECT col.column_name, col.data_type FROM information_schema.columns col WHERE col.table_name = 'stores'");
        console.log(r.rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
