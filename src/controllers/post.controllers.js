import { pool } from "../database/connection.database.js";
import { uploadImage } from "../helpers/cloudinary.helpers.js";
import fs from 'fs-extra';
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

//obtener las publicaciones del usuario autenticado
export const getUserPostMyPosts = async(req,res) => {
    const { userId } = req.params; 
    if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
    }
    try { 
        // Consulta para obtener todas las publicaciones del usuario 
        const resultSearch = await pool.query('select posts.post_id as post_id, posts.movie_id, posts.review, posts.rating, posts.favorite,posts.contains_spoilers, posts.watch_date, posts.reaction_photo, posts.tag, users.user_id as user_id, users.username, users.profile_picture from inner join users on posts.user_id = users.user_id where posts.userId = $1', [userId]);
        
        //si no se consiguen los post del usuario
        if (resultSearch.rows.length === 0) { 
            return res.status(404).json({ error: 'no posts founded' });
        } 
        res.status(200).json(resultSearch.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success:false,
            message: "An error occurred while searching user posts",
            error: error.message,
        });
    }
};


//actualizar una publicacion existente  /:userId/:movieId'
export const userUpdatePost = async (req,res) =>{
    // parametros necesarios para la busqueda
    const userId = req.params;
    const postId= req.params;
    const {rating,review,favorite,reaction_photo,tag, contains_spoilers,watch_Date} = req.body;
    let reactionPhotoUrl;

    try {
        //buscamos el post existente
        const postResult= await pool.query("select * from posts where post_id=$1 and user_id=$2",[postId,userId])

        //si no encuentra el post
        if (postResult.rows.length === 0){
            return res.status(404).json({error: "post don't found"})
        }


        const post= postResult.rows[0];

        const createdAd = new Date(post.created_at);
        const now= new Date();

        //verificamos si la publicacion tiene menos de 24 horas de publicada

        const timeSinceCreation= Math.abs( now - createdAd) /(100 * 60 * 60); //diferencia en horas
        if (timeSinceCreation > 24) {
            return res.status(400).json({error: "you can't edit this post, it's more that 24 hours since creation!"})
        }

        //si se cambia la foto reaccion, subir a Cloudinary y obtener la nueva URL
        if (req.files?.reaction_photo) {
            const uploadResult= await uploadImage(req.files.reaction_photo.tempFilePath);
            reactionPhotoUrl= uploadResult.secure_url; //URL de la imagen subida al servidor en la nube
        }

        //actualizacion del post en la base de datos
        const updateResult = await pool.query( "UPDATE POSTS SET review= $1,rating= $2, favorite =$3, contains_spoilers= $4, watch_date= $5, reaction_photo= $6, tag= $7 WHERE post_id= $8 and movieId= $9",[review,rating,favorite,contains_spoilers,watch_Date,reactionPhotoUrl||reaction_photo,tag, userId,movieId]);

        //si no consigue la publicacion
        if(updateResult.rows.length === 0){
            res.status(404).json({message: "post not found"});
        }
        res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error("Error updating post:",error);
        res.status(500).json({ 
            success:false,
            message: "An error occurred while updating the post",
            error: error.message,
        });

    }
};

//obtener los post de otros usuarios

//EN PROCESO, NO ESTA LISTO
export const getOtherUserPost = async(req,res) => {
    const userId = req.params;

    try {
        const result= await pool.query( "select review, rating, tag, favorite from posts where user_id =$1",[userId]);

        //si no encuentra las publicaciones
        if (result.rows.length === 0){
            res.status(405).json({error: "posts not founded from this user"})
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "something where wrong while getting the user posts ",
            error: error.message,
        })
    }
}

























































































































export const searchPosts = async (req, res) => {
    try {
        let { tag } = req.query;

        // Validar que el parámetro de búsqueda sea proporcionado y sea una cadena
        if (!tag || typeof tag !== 'string') {
            return res.status(400).json({ message: 'Por favor, proporciona un tag válido para la búsqueda.' });
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
            return res.status(404).json({ message: 'No se encontraron posts con el tag proporcionado.' });
        }

        // Devolver los resultados
        res.status(200).json(posts);
    } catch (error) {
        console.error('Error en la búsqueda de posts:', error);
        res.status(500).json({ message: 'Error al buscar posts.', error: error.message });
    }
};
