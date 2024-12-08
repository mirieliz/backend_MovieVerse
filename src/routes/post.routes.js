import { Router } from "express";
import { createPost, getRecentPosts, getPostById, searchPosts, getUserPostMyPosts, userUpdatePost, getOtherUserPost} from "../controllers/post.controllers.js";
import validatePost from "../validators/createPost.validators.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

// endpoints 
router.post('/posts', authenticateToken, createPost);

router.get('/posts/recent', authenticateToken, getRecentPosts);

router.get('/posts/search', authenticateToken, searchPosts);

router.get('/posts/:postId', authenticateToken, getPostById);


router.put('/posts/:postId',userUpdatePost);

router.get('/users/:userId/posts', getOtherUserPost);
export default router; 