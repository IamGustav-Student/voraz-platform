import { query } from '../config/db.js';

/**
 * Devuelve el tenant_id del tenant actual (puede ser integer o string subdomain).
 */
export function getTenantId(req) {
  return req.tenant?.id ?? req.store?.id ?? 1;
}

/**
 * Resuelve el store_id (integer) para el tenant actual.
 * - Si ya es un número, lo devuelve directamente.
 * - Si es string (subdomain), busca el store INTEGER correspondiente.
 * - Fallback seguro: 1 (store original Gastro Red).
 */
export async function getStoreId(req) {
  const tenantId = getTenantId(req);

  // Ya es integer
  if (typeof tenantId === 'number' || /^\d+$/.test(String(tenantId))) {
    return parseInt(tenantId, 10);
  }

  // Es string subdomain — resolver a integer
  try {
    const r = await query(
      `SELECT id FROM stores
       WHERE tenant_id::varchar = $1::varchar
       ORDER BY id ASC LIMIT 1`,
      [tenantId]
    );
    const found = r.rows[0]?.id;
    if (found != null) return parseInt(found, 10);
  } catch (err) {
    console.error('getStoreId lookup error:', err?.message);
  }

  return 1;
}
