import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const SUPERADMIN_SECRET = process.env.GASTRORED_SUPERADMIN_SECRET;

if (!JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET no configurado. Usando clave de emergencia — CONFIGURAR EN PRODUCCIÓN.');
}
if (!SUPERADMIN_SECRET) {
  console.warn('⚠️  GASTRORED_SUPERADMIN_SECRET no configurado. Panel superadmin deshabilitado.');
}

const _JWT = JWT_SECRET || 'gastrored_dev_jwt_ONLY_LOCAL';
const _SA  = SUPERADMIN_SECRET || 'gastrored_dev_superadmin_ONLY_LOCAL';

export const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ status: 'error', message: 'Token requerido.' });
    try {
        const decoded = jwt.verify(token, _JWT);
        
        // Multi-tenancy check (IDOR Protection)
        if (req.tenant && req.tenant.id) {
            const userTenantId = decoded.tenant_id;
            const userStoreId = decoded.store_id;
            const currentTenantId = String(req.tenant.id);

            // Permitir si el tenant_id coincide O si el store_id coinciden (soportando legacy)
            const isMatch = (String(userTenantId) === currentTenantId) || 
                           (userStoreId && String(userStoreId) === currentTenantId);

            if (!isMatch && decoded.role !== 'superadmin') {
                return res.status(403).json({ 
                    status: 'error', 
                    message: 'Acceso denegado. No perteneces a este comercio.' 
                });
            }
        }

        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ status: 'error', message: 'Token inválido o expirado.' });
    }
};

export const adminMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ status: 'error', message: 'Token requerido.' });
    try {
        const decoded = jwt.verify(token, _JWT);

        // Multi-tenancy check (IDOR Protection)
        if (req.tenant && req.tenant.id) {
            const userTenantId = decoded.tenant_id;
            const userStoreId = decoded.store_id;
            const currentTenantId = String(req.tenant.id);

            const isMatch = (String(userTenantId) === currentTenantId) || 
                           (userStoreId && String(userStoreId) === currentTenantId);

            if (!isMatch && decoded.role !== 'superadmin') {
                return res.status(403).json({ 
                    status: 'error', 
                    message: 'Acceso denegado. No perteneces a este comercio.' 
                });
            }
        }

        if (decoded.role !== 'admin' && decoded.role !== 'manager' && decoded.role !== 'superadmin') {
            return res.status(403).json({ status: 'error', message: 'Acceso denegado. Se requiere rol admin.' });
        }
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ status: 'error', message: 'Token inválido o expirado.' });
    }
};

export const superadminMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ status: 'error', message: 'Token requerido.' });
    try {
        const decoded = jwt.verify(token, _SA);
        if (decoded.role !== 'superadmin') {
            return res.status(403).json({ status: 'error', message: 'Acceso denegado. Solo superadmin.' });
        }
        req.superadmin = decoded;
        next();
    } catch {
        res.status(401).json({ status: 'error', message: 'Token de superadmin inválido.' });
    }
};

export const optionalAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        try { req.user = jwt.verify(token, _JWT); } catch {}
    }
    next();
};
