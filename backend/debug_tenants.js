
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const pool = new pg.Pool({ connectionString });
const query = (text, params) => pool.query(text, params);

const GASTRORED_SUFFIX = 'gastrored.com.ar';

function extractSubdomain(host) {
  if (host.endsWith('.localhost')) {
    return host.replace('.localhost', '');
  }
  if (host.endsWith(`.${GASTRORED_SUFFIX}`)) {
    return host.slice(0, host.length - GASTRORED_SUFFIX.length - 1);
  }
  return null;
}

const hosts = [
  'localhost',
  'elnacional.localhost',
  'gastrored.com.ar',
  'elnacional.up.railway.app'
];

async function test() {
  console.log('--- DEBUG TENANT RESOLUTION ---');
  console.log('Using DB:', process.env.DB_NAME || 'DATABASE_URL set');
  
  for (const host of hosts) {
    const subdomainPart = extractSubdomain(host);
    console.log(`\nHost: ${host}`);
    console.log(`Extracted Subdomain: ${subdomainPart}`);
    
    try {
      if (subdomainPart) {
        const result = await query(
          `SELECT id, name, subdomain, status FROM tenants 
           WHERE id = $1 OR (subdomain IS NOT NULL AND subdomain = $1)
           LIMIT 1`,
          [subdomainPart]
        );
        if (result.rows.length) {
          console.log(`MATCH FOUND:`, result.rows[0]);
        } else {
          console.log(`NO MATCH FOUND for subdomain: ${subdomainPart}`);
        }
      } else {
        const result = await query(
          `SELECT id, name, subdomain, status FROM tenants WHERE custom_domain = $1 LIMIT 1`,
          [host]
        );
         if (result.rows.length) {
          console.log(`MATCH FOUND (Custom Domain):`, result.rows[0]);
        } else {
          console.log(`NO MATCH FOUND (No subdomain part)`);
        }
      }
    } catch (e) {
      console.error(`ERROR:`, e.message);
    }
  }
  process.exit(0);
}

test();
