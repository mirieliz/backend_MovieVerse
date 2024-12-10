import { Router } from "express";
import { addFavorite, removeFavorite, searchUsers, getUserPostMyPosts ,getOtherUserPost, getFavoriteMovies, changePassword, likedPosts} from "../controllers/user.controllers.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import validatePost from "../validators/createPost.validators.js";
import validatePassword from "../validators/password.validator.js";


const router = Router();

router.get('/search',authenticateToken, searchUsers);

router.post('/users/me/favorites', authenticateToken, addFavorite);

router.delete('/users/me/favorites/:movie_id', authenticateToken, removeFavorite);

//this endpoint had validations
router.get('/users/me/posts', getUserPostMyPosts );

router.get('/users/:userId/posts', authenticateToken ,getOtherUserPost);

router.get('/users/me/favorite-movies', authenticateToken, getFavoriteMovies);

//Cambio de contraseña
router.put('/users/me/password', authenticateToken, validatePassword(), changePassword);

router.get('/users/me/liked-post', likedPosts);

export default router;
