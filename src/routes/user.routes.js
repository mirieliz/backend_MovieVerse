import { Router } from "express";
import { addFavorite, removeFavorite, searchUsers, getUserPostMyPosts ,getOtherUserPost, getFavoriteMovies, changePassword, getUser, 
    updateUser, createTopMovies, updateTopMovie, getTopMovies, likedPosts, getOtherUser, getOtherTopMovies,
    userPasswordRecovery} from "../controllers/user.controllers.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import validatePost from "../validators/createPost.validators.js";
import validatePassword from "../validators/password.validator.js";

const router = Router();

router.get('/search', authenticateToken, searchUsers);

router.post('/users/me/favorites', authenticateToken, addFavorite);

router.delete(
  '/users/me/favorites/:movie_id',
  authenticateToken,
  removeFavorite
);

//this endpoint had validations
router.get('/users/me/posts', authenticateToken, getUserPostMyPosts);

router.get('/users/me/favorite-movies', authenticateToken, getFavoriteMovies);

router.get('/users/me', authenticateToken, getUser);

router.put('/users/me', authenticateToken, updateUser);

router.post('/topMovies', authenticateToken, createTopMovies);

router.get('/topMovies', authenticateToken, getTopMovies);

router.put('/topMovies', authenticateToken, updateTopMovie);

router.get('/users/:userId/top-movies', authenticateToken, getOtherTopMovies)

router.get('/users/:userId', authenticateToken, getOtherUser)

router.get('/users/:userId/posts', authenticateToken ,getOtherUserPost);

//Cambio de contraseña
router.put(
  '/users/me/password',
  authenticateToken,
  validatePassword(),
  changePassword
);

//recuperacion de contraseña para el usuario
router.post('/users/passwordRecovery', userPasswordRecovery);

router.get('/user/me/liked-post', authenticateToken, likedPosts);
export default router;
