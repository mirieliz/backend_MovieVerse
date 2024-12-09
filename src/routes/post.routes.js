import { Router } from "express";
import { createPost, getRecentPosts, getPostById, searchPosts, updatePost, deletePost, createComment, getPostComments} from "../controllers/post.controllers.js";
import validatePost from "../validators/createPost.validators.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import validateComment from "../validators/comments.validator.js";

const router = Router();

// endpoints 
router.post('/posts', authenticateToken, createPost);

router.get('/posts/recent', authenticateToken, getRecentPosts);

router.get('/posts/search', authenticateToken, searchPosts);

router.get('/posts/:postId', authenticateToken, getPostById);


router.put('/posts/:postId',authenticateToken,updatePost);

router.delete('/post/:postId',authenticateToken,deletePost);

router.post("/posts/:postId/comment",authenticateToken,validateComment(),createComment);

router.get('/posts/:postId/comments',authenticateToken,getPostComments);

export default router; 