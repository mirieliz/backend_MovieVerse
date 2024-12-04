import jwt from 'jsonwebtoken';

const token = jwt.sign(
    { username: 'test_user', email: 'test_user@email.com' }, // Payload
    'tokendeseguridaddepruebaaverquetalfunciona',           // Clave secreta (SECRET_TOKEN_KEY)
    { expiresIn: '1d' }                                     // Duración del token
);

console.log('Generated token:', token);  
