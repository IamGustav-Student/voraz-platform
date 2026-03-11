import { query } from '../config/db.js';

/**
 * Devuelve el tenant_id (string) del tenant actual.
 */
export function getTenantId(req) {
    return req.tenant?.id || req.store?.id || 'voraz';
}

/**
 * Resuelve el store_id (integer) desde la tabla stores para el tenant actual.
 * Usado para aislamiento multi-tenant en productos, pedidos, tenant_settings, etc.
 */
export async function getStoreId(req) {
    const tenantId = getTenantId(req);
    if (/^\d+$/.test(String(tenantId))) return parseInt(tenantId, 10);
    try {
        const r = await query(
            'SELECT id FROM stores WHERE CAST(tenant_id AS VARCHAR) = CAST($1 AS VARCHAR) ORDER BY id ASC LIMIT 1',
            [tenantId]
        );
        const foundId = r.rows[0]?.id;
        if (foundId != null && !Number.isNaN(parseInt(foundId, 10))) {
            return parseInt(foundId, 10);
        }
        return 1;
    } catch (err) {
        console.error('getStoreId error:', err?.message);
        return 1;
    }
}
