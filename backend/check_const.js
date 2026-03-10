import { query } from './src/config/db.js';

async function run() {
  try {
    const res = await query(`
      SELECT constraint_name 
      FROM information_schema.key_column_usage 
      WHERE table_name = 'categories' AND column_name = 'slug';
    `);
    console.log('Category constraints on slug:', res.rows);
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit();
}
run();
