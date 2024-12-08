import { Router } from "express";
import { addFavorite, removeFavorite } from "../controllers/user.controllers.js";
import { authenticateToken } from "../middleware/auth.middleware.js";



const router = Router();




router.post('/users/me/favorites', authenticateToken, addFavorite);

router.delete('/users/me/favorites/:movie_id', authenticateToken, removeFavorite);

export default router; 