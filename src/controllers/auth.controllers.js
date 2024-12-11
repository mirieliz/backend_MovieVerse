import { pool } from "../database/connection.database.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import blacklist from "../database/blacklist.database.js";

export const login= async (req,res)=>{
    
    // const row = await pool.query("select * from usuario")
    // res.json(row)
    const data = req.body;

    try {
        //validar si el correo esta en los registros de la base de datos
        const { rows } = await pool.query( "select * from Users where email = $1",[data.email])
        if( rows.length ===0){
            return res.json({mensaje: "credential not found"})
        }
        
        const hashPassword = rows[0].user_password
        // console.log(hashPassword)
        const validatePassword = await bcrypt.compare(data.password, hashPassword)

        if(validatePassword===false){
            return res.json({mensaje: "invalid credential "})
        }

        const user = rows[0];
        console.log(`id: ${user.user_id}`);
        console.log(`Username: ${user.username}`);
        console.log(`Email: ${user.email}`);

        //traemos el username del usuario
        const token = jwt.sign(
            { id: rows[0].user_id, username: rows[0].username, email: rows[0].email },
            process.env.SECRET_TOKEN_KEY,
            { expiresIn: '1d' }
        );
        
        return res.status(201).json({ success: true, message: 'User logged in successfully', token });

    } catch ( error ) {
        console.log( error )
    }
    // res.send('login')
}

export const register = async (req, res) => { 
    const data = req.body ;
    try {
        const { rows } = await pool.query( 
            "select * from Users where email = $1",
            [data.email]
        );
        
        if (rows.length !== 0) {
            return res.json({ mensaje: "This email is already registered" });
        }

        const checkUsername = await pool.query(
            "select * from Users where username = $1",
            [data.username]
        );
        
        if (checkUsername.rows.length > 0) {
            return res.json({ mensaje: "This username already exists" });
        }

        if (data.password !== data.confPassword) {
            return res.json({ mensaje: 'Passwords do not match' });
        }

        const passwordHash = await bcrypt.hash(data.password, 10);

        const { rows: newUser } = await pool.query(
            "INSERT INTO Users (username, email, user_password) VALUES ($1, $2, $3) RETURNING user_id",
            [data.username, data.email, passwordHash]
        );

        const idUser = newUser[0].user_id;

        console.log(`Username: ${data.username}`);
        console.log(`Email: ${data.email}`);
        console.log(`User ID: ${idUser}`);

        const token = jwt.sign(
            { id: idUser, username: data.username, email: data.email },
            process.env.SECRET_TOKEN_KEY,
            { expiresIn: '1d' }
        );

        return res.status(201).json({ 
            success: true, 
            message: 'User registered successfully', 
            token, 
            user_id: idUser // Incluimos el user_id en la respuesta
        });

    } catch (error) {
        console.log(error);
    }

};

    
    // res.send('register')
// logout (remover/invalidar el JWT)
export const logOut = async (req,res) => {

    // res.clearCookie('access_token').json({message: 'logout successful'});
    const token = req.token; //obtener el token actual

    blacklist.add(token);
    // res.clearCookie(token); //borrar el JWT

    res.status(200).json({message:'Logout successful. Token has been invalidated.'});
    
}

