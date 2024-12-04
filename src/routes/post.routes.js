import { Router } from "express";
import { createPost } from "../controllers/post.controllers.js";
import validatePost from "../validators/createPost.validators.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

// endpoints 
router.post('/posts', authenticateToken, createPost);


export default router; 