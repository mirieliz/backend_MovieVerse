import jwt from 'jsonwebtoken';
import blacklist from '../database/blacklist.database.js';
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Access token missing or invalid' });
    }

    if (blacklist.has(token)) {
        return res.status(403).json({ message: 'Invalid token' }); 
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_TOKEN_KEY);
        req.user = decoded; // Incluye id, username y email en req.user
        req.token = token; // Almacena el token en la solicitud para usarlo en el logout
        next(); // Continúa con la solicitud
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};
