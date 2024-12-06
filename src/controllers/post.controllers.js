import { pool } from "../database/connection.database.js";
import { uploadImage } from "../helpers/cloudinary.helpers.js";
import fs from 'fs-extra';

export const createPost = async (req, res) => {
    const { review, rating, favorite, contains_spoilers, watch_date, tag } = req.body;
    const userId = req.user.id;
    if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
    }
    
    const movieId = req.body.movie_id; // ID de la película recibido desde el frontend
    let reactionPhotoUrl = null;

    try {
        if (!movieId) {
            return res.status(400).json({ success: false, message: "movie_id is required" });
        }

        // Gestionar la subida de la imagen de reacción
        if (req.files?.reaction_photo) {
            const uploadedImage = await uploadImage(req.files.reaction_photo.tempFilePath);
            reactionPhotoUrl = uploadedImage.url; // URL de la imagen subida
            await fs.unlink(req.files.reaction_photo.tempFilePath); // Eliminar archivo temporal 
        }

        // Insertar los datos del post en la base de datos
        const query = `
            INSERT INTO Posts (user_id, movie_id, review, rating, favorite, contains_spoilers, watch_date, reaction_photo, created_at, tag)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
            RETURNING *`; 
        const values = [
            userId,
            movieId, 
            review,  
            rating,
            favorite || false,
            contains_spoilers || false,
            watch_date || null, 
            reactionPhotoUrl, 
            tag
        ];

        const { rows } = await pool.query(query, values);

        res.status(201).json({
            success: true, 
            message: "Post created successfully",
            post: rows[0]
        }); 
        
        console.log("Valores a insertar en la BD:", values);

    } catch (error) {
        console.error("Error creating post:", error); // Esto imprimirá el error completo
        res.status(500).json({ message: "An error occurred while creating the post", error: error.message });
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
                Posts.favorite,
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

    if (!postId) {
        return res.status(400).json({ message: "postId is required" });
    }

    try {
        const query = `
            SELECT 
                Posts.post_id AS post_id,
                Posts.movie_id,
                Posts.review,
                Posts.rating,
                Posts.favorite,
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

        const values = [postId];
        const { rows } = await pool.query(query, values);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Post not found" });
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


