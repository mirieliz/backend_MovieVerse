import { Router } from "express";
import { login, logOut, register } from "../controllers/auth.controllers.js";
import validateUserLogin from "../validators/login.validators.js";
import validateUserRegister from "../validators/register.validators.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

// endpoints 
router.post('/login', validateUserLogin() ,login);

router.post('/register',validateUserRegister(),register);

// Endpoint de prueba protegido
router.get('/protected', authenticateToken, (req, res) => {
    res.json({
        message: 'Access granted',
        user: req.user, // Información extraída del token
    });
});

router.post('/logout',authenticateToken ,logOut );

export default router;