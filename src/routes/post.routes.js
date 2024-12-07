import { Router } from "express";
import { createPost, getRecentPosts, getPostById, searchPosts} from "../controllers/post.controllers.js";
import validatePost from "../validators/createPost.validators.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

// endpoints 
router.post('/posts', authenticateToken, createPost);

router.get('/posts/recent', authenticateToken, getRecentPosts);

router.get('/posts/search', authenticateToken, searchPosts);

router.get('/posts/:postId', authenticateToken, getPostById);

export default router; 