import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'voraz_secret_key';

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

export const optionalAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        try { req.user = jwt.verify(token, JWT_SECRET); } catch {}
    }
    next();
};
