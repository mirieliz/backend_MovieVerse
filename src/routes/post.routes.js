import { Router } from "express";
import { createPost } from "../controllers/post.controllers.js";
import validatePost from "../validators/createPost.validators.js";

const router = Router();

// endpoints 
router.post('/createPost', validatePost() ,createPost);


export default router;