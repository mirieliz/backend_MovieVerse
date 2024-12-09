import { pool } from "../database/connection.database.js";
import { uploadImage } from "../helpers/cloudinary.helpers.js";
import fs from "fs-extra";

export const addFavorite = async (req, res) => {
  try {
    const userId = req.user.id; // Obtenido del token JWT
    const { movie_id } = req.body;

    // Verificar si la película ya está marcada como favorita
    const existingFavorite = await pool.query(
      `SELECT * FROM favorites WHERE user_id = $1 AND movie_id = $2`,
      [userId, movie_id]
    );

    if (existingFavorite.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "Movie is already marked as favorite." });
    }

    // Insertar en la tabla de favoritos
    await pool.query(
      `INSERT INTO favorites (user_id, movie_id) VALUES ($1, $2)`,
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
    console.error("Error al buscar usuarios:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};
