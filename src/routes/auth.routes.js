import { Router } from "express";
import { login, register } from "../controllers/auth.controllers.js";
import validateUserLogin from "../validators/login.validators.js";
import validateUserRegister from "../validators/register.validators.js";

const router = Router();

// endpoints 
router.post('/login', validateUserLogin() ,login);




router.post('/register',validateUserRegister(),register);

export default router;