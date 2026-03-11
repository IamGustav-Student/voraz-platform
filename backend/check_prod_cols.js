import { query } from './src/config/db.js';

async function run() {
  try {
    const res = await query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name = 'products';");
    console.log(res.rows);
  } catch(e) { console.error(e) }
  process.exit();
}
run();
