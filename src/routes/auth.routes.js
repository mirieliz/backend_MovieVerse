import { Router } from "express";
import { login, register } from "../controllers/auth.controllers.js";

const router = Router();

// endpoints 
router.post('/login', login);




router.post('/register', register);

export default router;