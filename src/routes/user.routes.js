import { Router } from "express";
import { searchUsers } from "../controllers/user.controllers.js";
import { authenticateToken } from "../middleware/auth.middleware.js";



const router = Router();

// endpoint para buscar usuarios
router.get('/search',authenticateToken, searchUsers);

export default router;
