import { pool } from "../database/connection.database.js";

export const searchUsers = async (req, res) => {
    try {
        // Obtén el parámetro de búsqueda desde la consulta (query string)
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ message: 'El parámetro de búsqueda es requerido.' });
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
        console.error('Error al buscar usuarios:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
}
