import { pool } from "../database/connection.database.js";
import { uploadImage } from "../helpers/cloudinary.helpers.js";
import fs from "fs-extra";

export const addFavorite = async (req, res) => {
  try {
    const userId = req.user.id; // Obtenido del token JWT
    const { movie_id } = req.body;

    // Verificar si la película ya está marcada como favorita
    const existingFavorite = await pool.query(
      `SELECT * FROM public.favorites WHERE user_id = $1 AND movie_id = $2`,
      [userId, movie_id]
    );

    if (existingFavorite.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "Movie is already marked as favorite." });
    }

    // Insertar en la tabla de favoritos
    await pool.query(
      `INSERT INTO public.favorites (user_id, movie_id) VALUES ($1, $2)`,
      [userId, movie_id]
    );

    res.status(201).json({ message: "Movie marked as favorite successfully." });
  } catch (error) {
    console.error("Error marking movie as favorite:", error);
    res.status(500).json({ message: "Failed to mark movie as favorite." });
  }
};

export const removeFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { movie_id } = req.params;

    const result = await pool.query(
      `DELETE FROM favorites WHERE user_id = $1 AND movie_id = $2`,
      [userId, movie_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Favorite not found." });
    }

    res
      .status(200)
      .json({ message: "Movie removed from favorites successfully." });
  } catch (error) {
    console.error("Error removing favorite movie:", error);
    res.status(500).json({ message: "Failed to remove favorite movie." });
  }
};

//buscar usuario por username o email
export const searchUsers = async (req, res) => {
  try {
    // Obtén el parámetro de búsqueda desde la consulta (query string)
    const { query } = req.query;
    if (!query) {
      return res
        .status(400)
        .json({ message: "El parámetro de búsqueda es requerido." });
    }

    // Define el patrón de búsqueda (similar a SQL LIKE con comodines)
    const searchQuery = `%${query}%`;

    // Realiza la consulta a la base de datos
    const result = await pool.query(
      `SELECT user_id, username, email
            FROM users
            WHERE username ILIKE $1 OR email ILIKE $1;`,
      [searchQuery]
    );

    // Responde con los usuarios encontrados
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error searching user:", error);
    res.status(500).json({ message: "failed on searching users try again " });
  }
};

//obtener las publicaciones del usuario autenticado
export const getUserPostMyPosts = async (req, res) => {
  const { userId } = req.user.id; //id de usuario extraido del jwt

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }
  try {
    // Consulta para obtener todas las publicaciones del usuario
    const resultSearch = await pool.query(
      "select posts.post_id as post_id, posts.movie_id, posts.review, posts.rating, posts.favorite,posts.contains_spoilers, posts.watch_date, posts.reaction_photo, posts.tag, users.user_id as user_id, users.username, users.profile_picture from inner join users on posts.user_id = users.user_id where posts.userId = $1",
      [userId]
    );

    //si no se consiguen los post del usuario
    if (resultSearch.rows.length === 0) {
      return res.status(404).json({ error: "no posts founded" });
    }
    res.status(200).json(resultSearch.rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while searching user posts",
      error: error.message,
    });
  }
};

//obtener los post de otros usuarios

//PROBAR
export const getOtherUserPost = async (req, res) => {
  const { userId } = req.params;

  try {
    const searchUser = await pool.query(
      "select * from users where user_id =$1",
      [userId]
    );

    //verificamos que el usuario exista
    if (searchUser.rows.length === 0) {
      return res.status(400).json({ error: "user not founded" });
    }

    //obtener los post del usuario
    const postsResult = await pool.query(
      "select posts.review, posts.rating, posts.tag, posts.favorite from posts where posts.user_id =$1",
      [userId]
    );

    //si no encuentra las publicaciones
    if (postsResult.rows.length === 0) {
      res.status(405).json({ error: "posts not founded from this user" });
    }

    res.status(200).json(postsResult.rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "something where wrong while getting the user posts ",
      error: error.message,
    });
  }
};

export const getFavoriteMovies = async (req, res) => {
  try {
    const userId = req.user.id; // ID del usuario autenticado
    const { page = 1, limit = 20 } = req.query; // Página y límite desde el query string

    const offset = (page - 1) * limit; // Calcular el offset para la paginación

    // Consulta a la base de datos con paginación
    const favoriteMovies = await pool.query(
      `SELECT movie_id
         FROM favorites
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Extraer los IDs de las películas
    const movieIds = favoriteMovies.rows.map((fav) => fav.movie_id);

    res.status(200).json({
      page: Number(page),
      limit: Number(limit),
      total: movieIds.length,
      data: movieIds,
    });
  } catch (error) {
    console.error("Error fetching favorite movies:", error.message);
    res.status(500).json({ error: "Error fetching favorite movies." });
  }
  
    // Cambio de password 
export const changePassword = async(res,req) => {
    
    const userId = req.params;

    // const {currentPassword, newPassword, confirmNewPassword} = req.body;
    const data = req.body;

    //si no se proporcionan los valores
    if( !currentPassword || !newPassword || !confirmNewPassword){
        return res.json({message: 'this values are required'})
    }

    if(!userId){
        return res.status(401).json({ message: "User not authenticated" });
    }

    try {
        // Obtener la contraseña actual del usuario desde la base de datos 
        const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        } const user = userResult.rows[0];
        
        // Verificar la contraseña actual 
        const isMatch = await bcrypt.compare(data.currentPassword, user.password);
        
        if (!isMatch) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        //verificar la coincidencia en la nueva contraseña
        if(data.newPassword !== data.confirmNewPassword) {
            return res.status(401).json({message: "New password not match"});
        }

         // Hashing de la nueva contraseña 
        const hashedNewPassword = await bcrypt.hash(data.newPassword, 10); 
         // Actualizar la contraseña en la base de datos 
        await pool.query('UPDATE users SET user_password = $1 WHERE id = $2', [hashedNewPassword, userId]);
        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({message: "something was wrong changing the password"

        })
    }
};
