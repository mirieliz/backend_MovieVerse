import { pool } from "../database/connection.database.js";
import { uploadImage } from "../helpers/cloudinary.helpers.js";
import fs from "fs-extra";
import bcrypt from "bcryptjs";
import emailHelper from "../helpers/email.helpers.js";

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
  const userId = req.user.id; //id de usuario extraido del jwt

  if (!userId) {
    console.log(userId);
    return res.status(401).json({ message: "User not authenticated" });
  }
  try {
    // Consulta para obtener todas las publicaciones del usuario
    const resultSearch = await pool.query(
      "select posts.post_id as post_id, posts.movie_id, posts.review, posts.rating, posts.contains_spoilers, posts.watch_date, posts.reaction_photo, posts.tag, users.user_id as user_id, users.username, users.profile_picture FROM posts  inner join users on posts.user_id = users.user_id where posts.user_id = $1",
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
const { userId } = req.params; //id de otro usuario


  try {
    const searchUser = await pool.query(
      "select * from users where user_id =$1",
      [userId],
    );

    //verificamos que el usuario exista
    if (searchUser.rows.length === 0) {
      return res.status(400).json({ error: "user not founded" });
    }

    //obtener los post del usuario
    const postsResult = await pool.query(
      "select posts.review, posts.rating, posts.tag, posts.favorite from posts where posts.user_id =$1",
      [userId],
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
};
  
    // Cambio de password 
    export const changePassword = async (req, res) => {
      const userId = req.user.id; // Debe obtenerse del token autenticado
      const { currentPassword, newPassword, confirmNewPassword } = req.body;
    
      // Verificar que todos los valores estén proporcionados
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        return res.status(400).json({ message: 'These values are required' });
      }
    
      try {
        // Obtener la contraseña actual del usuario desde la base de datos 
        const userResult = await pool.query('SELECT user_password FROM Users WHERE user_id = $1', [userId]);
        
        if (userResult.rows.length === 0) {
          return res.status(404).json({ message: "User not found" });
        } 
        const user = userResult.rows[0];
        
        // Verificar la contraseña actual 
        const isMatch = await bcrypt.compare(currentPassword, user.user_password);
        
        if (!isMatch) {
          return res.status(401).json({ message: "Current password is incorrect" });
        }
    
        // Verificar la coincidencia en la nueva contraseña
        if (newPassword !== confirmNewPassword) {
          return res.status(401).json({ message: "New password does not match" });
        }
    
        // Hashing de la nueva contraseña 
        const hashedNewPassword = await bcrypt.hash(newPassword, 10); 
    
        // Actualizar la contraseña en la base de datos 
        await pool.query('UPDATE Users SET user_password = $1 WHERE user_id = $2', [hashedNewPassword, userId]);
    
        res.status(200).json({ message: "Password updated successfully" });
      } catch (error) {
        console.log(error);
        res.status(500).json({ 
          success: false,
          message: "Something went wrong changing the password",
          error: error.message 
        });
      }
    };

//
// posts a los que el usuario dio like
export const likedPosts = async (req, res) => {
  const userId = req.user.id;
  try {
    //consulta para traer los post a los que el usuario dio like
    const query = ` SELECT posts.post_id, posts.movie_id, posts.review, posts.rating, posts.contains_spoilers, posts.watch_date, posts.reaction_photo,  posts.created_at, users.user_id, users.username, users.profile_picture FROM Likes INNER JOIN posts ON Likes.post_id = posts.post_id INNER JOIN Users ON posts.user_id = Users.user_id WHERE Likes.user_id = $1 ORDER BY Post.updated_at DESC; `;
    const values = [userId];
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No liked posts found" });
    }
    res.status(200).json({ success: true, posts: rows });
  } catch (error) {
    console.error("Error fetching liked posts:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while retrieving the liked posts",
      error: error.message,
    });
  }
};

//restored
export const getUser = async (req, res) => {
  try {
    const userId = req.user.id; // Suponiendo que el middleware del JWT añade user_id

    // Consultar datos del usuario
    const query = `
            SELECT 
                user_id, 
                username, 
                description, 
                profile_picture 
            FROM users 
            WHERE user_id = $1;
        `;

    const { rows } = await pool.query(query, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    // Respuesta exitosa con los datos del usuario
    res.status(200).json({
      message: "User retrieved successfully.",
      user: rows[0],
    });
  } catch (error) {
    console.error("Error retrieving user:", error);
    res
      .status(500)
      .json({ message: "Failed to retrieve user.", error: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { username, description } = req.body;
    let profilePictureUrl = null;
    const userId = req.user.id; // Suponiendo que el middleware del JWT añade user_id

    // Validación de username único
    if (username) {
      const { rows: existingUsers } = await pool.query(
        "SELECT * FROM users WHERE username = $1 AND user_id != $2",
        [username, userId]
      );
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: "Username is already taken." });
      }
    }

    // Gestionar la subida de la imagen de perfil
    if (req.files?.profile_picture) {
      const uploadedImage = await uploadImage(
        req.files.profile_picture.tempFilePath
      );
      profilePictureUrl = uploadedImage.url;
      await fs.unlink(req.files.profile_picture.tempFilePath); // Eliminar archivo temporal
    }

    // Actualización de los datos en la BD
    const query = `
            UPDATE users 
            SET 
                username = COALESCE($1, username),
                description = COALESCE($2, description),
                profile_picture = COALESCE($3, profile_picture),
                updated_at = NOW()
            WHERE user_id = $4
            RETURNING *;
        `;

    const values = [
      username || null,
      description || null,
      profilePictureUrl || null,
      userId,
    ];

    console.log("Values for SQL:", values);

    const { rows } = await pool.query(query, values);

    // Respuesta exitosa
    res.status(200).json({
      message: "User updated successfully.",
      user: rows[0],
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res
      .status(500)
      .json({ message: "Failed to update user.", error: error.message });
  }

  const { description } = req.body;
  console.log("Received Description:", description);
};

export const createTopMovies = async (req, res) => {
  try {
    const { topMovies } = req.body; // Array de movie_ids
    const userId = req.user?.id; // Middleware JWT debería añadir `user.id`

    if (!userId) {
      return res.status(400).json({ message: "User ID is missing." });
    }

    // Verificar si ya existe un top_movies para el usuario
    const existingTopMovies = await pool.query(
      `
            SELECT * FROM top_movies WHERE user_id = $1;
        `,
      [userId]
    );

    if (existingTopMovies.rows.length > 0) {
      return res.status(200).json({
        message: "Top movies already exist for this user.",
        topMovies: existingTopMovies.rows,
      });
    }

    // Validación del array
    if (!Array.isArray(topMovies) || topMovies.length !== 3) {
      return res
        .status(400)
        .json({ message: "Top movies must contain exactly 3 movie IDs." });
    }

    // Construcción segura de la consulta SQL
    const values = topMovies
      .map((movieId, index) => {
        if (!movieId) throw new Error("Invalid movie ID in topMovies array");
        return `(${userId}, '${movieId}', ${index + 1})`;
      })
      .join(", ");

    const query = `
            INSERT INTO top_movies (user_id, movie_id, rank) 
            VALUES ${values}
            RETURNING *;
        `;

    const { rows } = await pool.query(query);
    res
      .status(201)
      .json({ message: "Top movies created successfully.", topMovies: rows });
  } catch (error) {
    console.error("Error creating top movies:", error);
    res
      .status(500)
      .json({ message: "Failed to create top movies.", error: error.message });
  }
};

export const getTopMovies = async (req, res) => {
  try {
    const userId = req.user?.id; // Middleware JWT should add user.id

    if (!userId) {
      return res.status(400).json({ message: "User ID is missing." });
    }

    // Retrieve top movies for the user, selecting only movie_id and rank
    const topMovies = await pool.query(
      `
        SELECT movie_id, rank
        FROM top_movies
        WHERE user_id = $1
        ORDER BY rank ASC;
    `,
      [userId]
    );

    if (topMovies.rows.length === 0) {
      return res
        .status(200)
        .json({ message: "No top movies found for this user." });
    }

    res.status(200).json({
      message: "Top movies retrieved successfully.",
      topMovies: topMovies.rows,
    });
  } catch (error) {
    console.error("Error retrieving top movies:", error);
    res.status(500).json({
      message: "Failed to retrieve top movies.",
      error: error.message,
    });
  }
};

export const updateTopMovie = async (req, res) => {
  try {
    const { rank, movieId } = req.body; // Rank: posición (1, 2 o 3); movieId: nuevo ID de película
    const userId = req.user.id;

    // Validaciones
    if (!rank || rank < 1 || rank > 3) {
      return res.status(400).json({ message: "Rank must be between 1 and 3." });
    }

    if (!movieId) {
      return res.status(400).json({ message: "Movie ID is required." });
    }

    // Actualizar la película en la posición específica
    const query = `
            UPDATE top_movies
            SET movie_id = $1, updated_at = NOW()
            WHERE user_id = $2 AND rank = $3
            RETURNING *;
        `;
    const { rows } = await pool.query(query, [movieId, userId, rank]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Top movie not found or invalid rank." });
    }

    res
      .status(200)
      .json({ message: "Top movie updated successfully.", topMovie: rows[0] });
  } catch (error) {
    console.error("Error updating top movie:", error);
    res
      .status(500)
      .json({ message: "Failed to update top movie.", error: error.message });
  }
};

export const getOtherUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const query = `
            SELECT 
                username, 
                description, 
                profile_picture 
            FROM users 
            WHERE user_id = $1;
        `;

        const { rows } = await pool.query(query, [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        res.status(200).json({
            message: "User retrieved successfully.",
            user: rows[0],
        });
    } catch (error) {
        console.error("Error retrieving user:", error);
        res.status(500).json({ message: "Failed to retrieve user.", error: error.message });
    }
};

export const getOtherTopMovies = async (req, res) => {
    try {
        const { userId } = req.params;

        const query = `
            SELECT 
                movie_id, 
                rank 
            FROM top_movies 
            WHERE user_id = $1
            ORDER BY rank ASC;
        `;

        const { rows } = await pool.query(query, [userId]);

        if (rows.length === 0) {
            return res.status(200).json({ message: "No top movies found for this user." });
        }

        res.status(200).json({
            message: "Top movies retrieved successfully.",
            topMovies: rows,
        });
    } catch (error) {
        console.error("Error retrieving top movies:", error);
        res.status(500).json({ message: "Failed to retrieve top movies.", error: error.message });
    }
};


//recuperar la contraseña via email
export const userPasswordRecovery = async (req,res) => {
  const { to, subject, text} = req.body;

  try {
    let info = await emailHelper(to, subject, text);
    res.status(200).send(`Email sent: ${info.response}`);
  } catch (error) {
    res.status(500).send("Error sending email");
  }
};