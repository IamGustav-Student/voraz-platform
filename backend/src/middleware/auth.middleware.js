import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'voraz_secret_key';
const SUPERADMIN_SECRET = process.env.GASTRORED_SUPERADMIN_SECRET || 'gastrored_super_secret';

export const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ status: 'error', message: 'Token requerido.' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ status: 'error', message: 'Token inválido o expirado.' });
    }
};

export const adminMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ status: 'error', message: 'Token requerido.' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
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
        const decoded = jwt.verify(token, SUPERADMIN_SECRET);
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
        try { req.user = jwt.verify(token, JWT_SECRET); } catch {}
    }
    next();
};
