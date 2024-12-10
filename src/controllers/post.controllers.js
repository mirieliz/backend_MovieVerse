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

//actualizar una publicacion existente  
export const updatePost = async (req,res) =>{
    // parametros necesarios para la busqueda
    const userId = req.params;      //lo obtenemos del JWT
    const postId= req.params;       //como lo obtengo???
    const {rating,review,favorite,reaction_photo,tag, contains_spoilers,watch_Date,updated_At} = req.body;
    let reactionPhotoUrl;

    try {
        //buscamos el post existente
        const postResult= await pool.query("select * from posts where post_id=$1 and user_id=$2",[postId,userId])

        //si no encuentra el post
        if (postResult.rows.length === 0){
            return res.status(404).json({error: "post don't found"})
        }

        const post= postResult.rows[0];

        //verificamos si la publicacion tiene menos de 24 horas de publicada
        const createdAd = new Date(post.created_at);
        const now= new Date();

        
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
        const updatedPost = await pool.query( "UPDATE POSTS SET review= $1,rating= $2, favorite =$3, contains_spoilers= $4, watch_date= $5, reaction_photo= $6, tag= $7, updated_at = current_timestamp WHERE post_id= $8 ",[review,rating,favorite,contains_spoilers,watch_Date,reactionPhotoUrl||reaction_photo,tag, updated_At,postId]);

        //si no consigue la publicacion
        if(updatedPost.rows.length === 0){
            res.status(404).json({message: "post not found"});
        }
        res.status(200).json({
            message: 'post updated successfully',
            post:updatedPost.rows[0],
        });

    } catch (error) {
        console.error("Error updating post:",error);
        res.status(500).json({ 
            success:false,
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
export const deletePost = async(req,res) =>{
    const userId = req.user.id;
    const {postId}= req.params;

    try {

        //buscamos el post existente
        const postResult= await pool.query("select * from posts where post_id=$1 and user_id=$2",[postId,userId])

        //si no encuentra el post
        if (postResult.rows.length === 0){
            return res.status(404).json({error: "post don't found"})
        }

        const post = postResult.rows[0];
        const movieId = post.movie_id;

        //eliminar el post
        const deletePost = await pool.query("delete from posts where post_id=$1 and posts.user_id=$2",[postId,userId
        ]);
        
        //verificar si no esta marcada como favorita
        const checkFavorite = await pool.query("select * from favorites where user_id=$1 and movie_id=$2",[userId,movieId])

        if(checkFavorite.rows.length > 0) {
            deleteFavorite= await pool.query("delete from favorites where user_id= $1 and movie_id= $2")
        }

        res.status(200).json({message:'post deleted susuccessfully'});
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success:false,
            message: 'An error occurred while deleting the post'
        })
    }
};

//crear comentario en un post
export const createComment = async(req,res) =>{
    const  userId  = req.user.id; //obtener user id desde el jwt
    const   postId   = parseInt(req.params.postId,10);
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

        const postCheck = await pool.query(`select * from posts where post_id=$1;`,[parseInt(postId, 10)],);
        if(postCheck.rows.length === 0){
            return res.status(404).json({message: "post not found"});
        }
        //sentencia para insertar el comentario
        const query = ` INSERT INTO Comments (post_id, user_id, user_comment, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *`;
        const values = [postId, userId, comment];
        const { rows } = await pool.query(query, values);

        // const commentAdd= await pool.query("insert into comments values post_id=$1,user_id=$2,user_comment=$3,created_at= now() returning *;",[parseInt(postId, 10),userId,comment]);

        if(rows.length === 0) {
            return res.json({message: "something went wrong creating your comment"})
        }
        res.status(201).json({
            success: true,
            message: "comment added successfully",
            comment: rows[0]
        });
        
    } catch (error) {
        console.log(error);
        res.status(200).json({
            success:false,
            message: "something happened while created you comment",
            error: error.message,
        })
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
