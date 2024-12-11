import { pool } from "../database/connection.database.js";
import { uploadImage } from "../helpers/cloudinary.helpers.js";
import fs from "fs-extra";
import { authenticateToken } from "../middleware/auth.middleware.js";

export const createPost = async (req, res) => {
  const { review, rating, contains_spoilers, watch_date, tag } = req.body;
  const userId = req.user.id;
  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  const movieId = req.body.movie_id; // ID de la película recibido desde el frontend
  let reactionPhotoUrl = null;

  try {
    if (!movieId) {
      return res
        .status(400)
        .json({ success: false, message: "movie_id is required" });
    }

    // Gestionar la subida de la imagen de reacción
    if (req.files?.reaction_photo) {
      const uploadedImage = await uploadImage(
        req.files.reaction_photo.tempFilePath
      );
      reactionPhotoUrl = uploadedImage.url; // URL de la imagen subida
      await fs.unlink(req.files.reaction_photo.tempFilePath); // Eliminar archivo temporal
    }

    // Insertar los datos del post en la base de datos
    const query = `
            INSERT INTO Posts (user_id, movie_id, review, rating, contains_spoilers, watch_date, reaction_photo, created_at, tag)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
            RETURNING *`;
    const values = [
      userId,
      movieId,
      review,
      rating,
      contains_spoilers || false,
      watch_date || null,
      reactionPhotoUrl,
      tag,
    ];

    const { rows } = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      post: rows[0],
    });

    console.log("Valores a insertar en la BD:", values);
  } catch (error) {
    console.error("Error creating post:", error); // Esto imprimirá el error completo
    res.status(500).json({
      message: "An error occurred while creating the post",
      error: error.message,
    });
  }
};

export const getRecentPosts = async (req, res) => {
  try {
    // Obtener los parámetros de paginación de la solicitud (por defecto, página 1, 20 posts por página)
    const { page = 1, limit = 20 } = req.query;

    // Calcular el offset para la paginación
    const offset = (page - 1) * limit;

    const query = `
            SELECT 
                Posts.post_id AS post_id,
                Posts.movie_id,
                Posts.review,
                Posts.rating,
                Posts.contains_spoilers,
                Posts.watch_date,
                Posts.reaction_photo,
                Posts.tag,
                Posts.created_at,
                Users.user_id AS user_id,
                Users.username,
                Users.profile_picture
            FROM Posts
            INNER JOIN Users ON Posts.user_id = Users.user_id
            ORDER BY Posts.created_at DESC
            LIMIT $1 OFFSET $2;
        `;

    const values = [limit, offset];
    const { rows } = await pool.query(query, values);

    res.status(200).json({
      success: true,
      currentPage: parseInt(page, 10),
      posts: rows,
    });
  } catch (error) {
    console.error("Error fetching recent posts:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching recent posts",
      error: error.message,
    });
  }
};

export const getPostById = async (req, res) => {
  const { postId } = req.params;

  if (!postId || isNaN(parseInt(postId, 10))) {
    return res.status(400).json({ message: "Invalid postId provided" });
  }

  try {
    const query = `
            SELECT 
                Posts.post_id AS post_id,
                Posts.movie_id,
                Posts.review,
                Posts.rating,
                Posts.contains_spoilers,
                Posts.watch_date,
                Posts.reaction_photo,
                Posts.tag,
                Posts.created_at,
                Users.user_id AS user_id,
                Users.username,
                Users.profile_picture
            FROM Posts
            INNER JOIN Users ON Posts.user_id = Users.user_id
            WHERE Posts.post_id = $1;
        `;

    const values = [parseInt(postId, 10)];
    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    res.status(200).json({
      success: true,
      post: rows[0],
    });
  } catch (error) {
    console.error("Error fetching post by ID:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the post",
      error: error.message,
    });
  }
};

export const updatePost = async (req, res) => {
  const userId = req.user.id; // Obtener desde el JWT
  const postId = parseInt(req.params.postId, 10); // Obtener desde los parámetros de ruta
  const {
    rating,
    review,
    favorite,
    reaction_photo,
    tag,
    contains_spoilers,
    watch_Date,
  } = req.body;
  let reactionPhotoUrl = reaction_photo; // Inicializar con el valor actual

  // Validación del postId
  if (isNaN(postId)) {
    return res.status(400).json({ message: "Invalid postId provided" });
  }

  try {
    // Buscar el post existente
    const { rows } = await pool.query(
      "SELECT * FROM posts WHERE post_id = $1 AND user_id = $2",
      [postId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = rows[0];
    const createdAt = new Date(post.created_at);
    const now = new Date();

    // Validar si el post tiene más de 24 horas
    const timeSinceCreation = (now - createdAt) / (1000 * 60 * 60); // Diferencia en horas
    if (timeSinceCreation > 24) {
      return res.status(400).json({
        error: "You can't edit this post, it's been more than 24 hours!",
      });
    }

    // Subir nueva foto de reacción, si existe
    if (req.files?.reaction_photo) {
      const uploadResult = await uploadImage(
        req.files.reaction_photo.tempFilePath
      );
      reactionPhotoUrl = uploadResult.secure_url;
    }

    // Actualizar el post en la base de datos
    const { rows: updatedRows } = await pool.query(
      `UPDATE posts
       SET review = $1, rating = $2, contains_spoilers = $3,
           watch_date = $4, reaction_photo = $5, tag = $6, updated_at = current_timestamp
       WHERE post_id = $7 AND user_id = $8
       RETURNING *`,
      [
        review,
        rating,
        contains_spoilers,
        watch_Date,
        reactionPhotoUrl,
        tag,
        postId,
        userId,
      ]
    );

    if (updatedRows.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json({
      message: "Post updated successfully",
      post: updatedRows[0],
    });
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the post",
      error: error.message,
    });
  }
};

//  /users/me/liked-posts
// export const like_posts = async(req,res) =>{
//     const posts = await post.findAll({
//     where: {
//       user_id: userId,
//       deletedAt: null
//     },
//     include: [
//       {
//         model: User,
//         attributes: ['user_id', 'username']
//       }
//     ],
//     order: [['updatedAt', 'DESC']]
//   });

// };

//eliminar un post del usuario que no tenga mas de 24
export const deletePost = async (req, res) => {
  const userId = req.user.id;
  const postId = parseInt(req.params.postId, 10);

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (isNaN(postId)) {
    return res.status(400).json({ message: "Invalid postId provided" });
  }

  try {
    // Buscar el post existente
    const postResult = await pool.query(
      "SELECT * FROM posts WHERE post_id = $1 AND user_id = $2",
      [postId, userId]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = postResult.rows[0];
    const movieId = post.movie_id;

    // Eliminar el post
    await pool.query("DELETE FROM posts WHERE post_id = $1 AND user_id = $2", [
      postId,
      userId,
    ]);

    // Verificar si la película está marcada como favorita y eliminarla
    const checkFavorite = await pool.query(
      "SELECT * FROM favorites WHERE user_id = $1 AND movie_id = $2",
      [userId, movieId]
    );

    if (checkFavorite.rows.length > 0) {
      await pool.query(
        "DELETE FROM favorites WHERE user_id = $1 AND movie_id = $2",
        [userId, movieId]
      );
    }

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error while deleting post:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the post",
    });
  }
};

//crear comentario en un post
export const createComment = async (req, res) => {
  const userId = req.user.id; //obtener user id desde el jwt
  const postId = parseInt(req.params.postId, 10);
  const { comment } = req.body;

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (isNaN(postId)) {
    return res.status(400).json({ message: "Invalid postId provided" });
  }

  // if(!postId){
  //     return res.status(400).json({message: 'post id required'});
  // }

  try {
    const postCheck = await pool.query(
      `select * from posts where post_id=$1;`,
      [parseInt(postId, 10)]
    );
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ message: "post not found" });
    }
    //sentencia para insertar el comentario
    const query = ` INSERT INTO Comments (post_id, user_id, user_comment, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *`;
    const values = [postId, userId, comment];
    const { rows } = await pool.query(query, values);

    // const commentAdd= await pool.query("insert into comments values post_id=$1,user_id=$2,user_comment=$3,created_at= now() returning *;",[parseInt(postId, 10),userId,comment]);

    if (rows.length === 0) {
      return res.json({
        message: "something went wrong creating your comment",
      });
    }
    res.status(201).json({
      success: true,
      message: "comment added successfully",
      comment: rows[0],
    });
  } catch (error) {
    console.log(error);
    res.status(200).json({
      success: false,
      message: "something happened while created you comment",
      error: error.message,
    });
  }
};

//traer todos los comentarios de un post
export const getPostComments = async (req, res) => {
  // const postId = req.params;

  const postId = parseInt(req.params.postId, 10);
  if (isNaN(postId)) {
    return res.status(400).json({ success: false, message: "Invalid post ID" });
  }

  try {
    //consulta para obtener los comentarios asociados al post ademas del username y avatar de los usuarios que comentaron
    const commentsResult = await pool.query(
      "select c.comment_id ,c.user_comment , c.created_at, u.profile_picture, u.username from comments c join users u on c.user_id = u.user_id where c.post_id =$1",
      [postId]
    );

    //si no consigue los comentarios
    if (commentsResult.rows.length === 0) {
      return res
        .status(401)
        .json({ message: "no comments founded for this post" });
    }

    res
      .status(200)
      .json({ message: "comments founded", comments: commentsResult.rows });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "something was wrong searching the post comments",
      error: error.message,
    });
  }
};

export const addLike = async (req, res) => {
  try {
    const userId = req.user.id; // Obtenido del token JWT
    const { postId } = req.params;

    // Verificar si ya existe el like
    const existingLike = await pool.query(
      `SELECT * FROM public.likes WHERE user_id = $1 AND post_id = $2`,
      [userId, postId]
    );

    if (existingLike.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "You have already liked this post." });
    }

    // Insertar el like
    await pool.query(
      `INSERT INTO public.likes (user_id, post_id) VALUES ($1, $2)`,
      [userId, postId]
    );

    res.status(201).json({ message: "Post liked successfully." });
  } catch (error) {
    console.error("Error adding like:", error);
    res.status(500).json({ message: "Failed to like the post." });
  }
};

export const removeLike = async (req, res) => {
  try {
    const userId = req.user.id; // Obtenido del token JWT
    const { postId } = req.params;

    // Verificar si existe el like
    const existingLike = await pool.query(
      `SELECT * FROM public.likes WHERE user_id = $1 AND post_id = $2`,
      [userId, postId]
    );

    if (existingLike.rows.length === 0) {
      return res
        .status(400)
        .json({ message: "You haven't liked this post yet." });
    }

    // Eliminar el like
    await pool.query(
      `DELETE FROM public.likes WHERE user_id = $1 AND post_id = $2`,
      [userId, postId]
    );

    res.status(200).json({ message: "Like removed successfully." });
  } catch (error) {
    console.error("Error removing like:", error);
    res.status(500).json({ message: "Failed to remove like." });
  }
};

export const getLikes = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id; // Asegúrate de que el middleware decodifique el token y pase el userId

    // Obtener la cantidad total de likes para el post
    const likeCountQuery = `
            SELECT COUNT(*) AS like_count 
            FROM public.likes 
            WHERE post_id = $1
        `;
    const likeCountResult = await pool.query(likeCountQuery, [postId]);
    const likeCount = parseInt(likeCountResult.rows[0].like_count, 10);

    // Verificar si el usuario actual ya dio like
    const userLikedQuery = `
            SELECT EXISTS (
                SELECT 1 
                FROM public.likes 
                WHERE post_id = $1 AND user_id = $2
            ) AS user_liked
        `;
    const userLikedResult = await pool.query(userLikedQuery, [postId, userId]);
    const userLiked = userLikedResult.rows[0].user_liked;

    console.log("Request received for postId:", req.params.postId);

    // Responder con la cantidad de likes y si el usuario dio like
    res.status(200).json({ likes: likeCount, userLiked });
  } catch (error) {
    console.error("Error fetching likes:", error);
    res.status(500).json({ message: "Failed to fetch likes." });
  }
};

// Endpoint para listar todos los posts relacionados con una película específica
export const getPostsByMovieId = async (req, res) => {
  const { movieId } = req.params;

  if (!movieId || isNaN(parseInt(movieId, 10))) {
    return res.status(400).json({ message: "Invalid movieId provided" });
  }

  try {
    const query = `
            SELECT 
                Posts.post_id AS post_id,
                Posts.movie_id,
                Posts.review,
                Posts.rating,
                Users.username,
                Users.profile_picture,
                Posts.created_at
            FROM Posts
            INNER JOIN Users ON Posts.user_id = Users.user_id
            WHERE Posts.movie_id = $1
            ORDER BY Posts.created_at DESC;
        `;

    const values = [parseInt(movieId, 10)];
    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No posts found for this movie" });
    }

    res.status(200).json({
      success: true,
      posts: rows,
    });
  } catch (error) {
    console.error("Error fetching posts by movie ID:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching posts",
      error: error.message,
    });
  }
};

export const searchPosts = async (req, res) => {
  try {
    let { tag } = req.query;

    // Validar que el parámetro de búsqueda sea proporcionado y sea una cadena
    if (!tag || typeof tag !== "string") {
      return res.status(400).json({
        message: "Por favor, proporciona un tag válido para la búsqueda.",
      });
    }

    // Eliminar espacios adicionales del tag
    tag = tag.trim();

    // Obtener los parámetros de paginación de la solicitud (por defecto, página 1, 20 posts por página)
    const { page = 1, limit = 20 } = req.query;

    // Calcular el offset para la paginación
    const offset = (page - 1) * limit;

    // Consultar la base de datos para buscar posts que coincidan con el tag
    const query = `
            SELECT 
                Posts.post_id AS post_id,
                Posts.movie_id,
                Posts.review,
                Posts.rating,
                Posts.contains_spoilers,
                Posts.watch_date,
                Posts.reaction_photo,
                Posts.tag,
                Posts.created_at,
                Users.user_id AS user_id,
                Users.username,
                Users.profile_picture
            FROM Posts
            INNER JOIN Users ON Posts.user_id = Users.user_id
            WHERE EXISTS (
                SELECT 1 
                FROM unnest(string_to_array(Posts.tag, ',')) AS single_tag
                WHERE single_tag ILIKE $1
            )
            ORDER BY Posts.created_at DESC;
        `;

    // Ejecutar la consulta con el parámetro del tag
    const { rows: posts } = await pool.query(query, [tag]);

    // Verificar si hay resultados
    if (posts.length === 0) {
      return res
        .status(404)
        .json({ message: "No se encontraron posts con el tag proporcionado." });
    }

    // Devolver los resultados
    res.status(200).json(posts);
  } catch (error) {
    console.error("Error en la búsqueda de posts:", error);
    res
      .status(500)
      .json({ message: "Error al buscar posts.", error: error.message });
  }
};
