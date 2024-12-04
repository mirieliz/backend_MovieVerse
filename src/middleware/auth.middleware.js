import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Access token missing or invalid' });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_TOKEN_KEY);
        req.user = decoded; // Agrega la información del usuario al request
        next(); // Continúa con la solicitud
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};
