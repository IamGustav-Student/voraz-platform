import { query } from './src/config/db.js';

async function run() {
  try {
    const res = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
  process.exit();
}
run();
