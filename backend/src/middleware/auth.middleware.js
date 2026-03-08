import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const SUPERADMIN_SECRET = process.env.GASTRORED_SUPERADMIN_SECRET;

if (!JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET no configurado. Usando clave de emergencia — CONFIGURAR EN PRODUCCIÓN.');
}
if (!SUPERADMIN_SECRET) {
  console.warn('⚠️  GASTRORED_SUPERADMIN_SECRET no configurado. Panel superadmin deshabilitado.');
}

const _JWT = JWT_SECRET || 'voraz_dev_secret_key_CAMBIAR';
const _SA  = SUPERADMIN_SECRET || 'gastrored_dev_secret_CAMBIAR';

export const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ status: 'error', message: 'Token requerido.' });
    try {
        req.user = jwt.verify(token, _JWT);
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
