import { query } from './src/config/db.js';

async function run() {
  try {
    const res = await query("SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'products';");
    console.log(res.rows);
  } catch(e) { console.error(e) }
  process.exit();
}
run();
