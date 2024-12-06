import { pool } from "../database/connection.database.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

        //traemos el username del usuario
        const username = rows[0].username
        //asignacion de JWT con los parametros username and email
        const token = jwt.sign({username:username,email:data.email},process.env.SECRET_TOKEN_KEY,{expiresIn: '1d'}) // payload, key ,duracion del token
        return res.status(201).json({success: true, mensaje: 'user logged successfully',token:token})



    } catch ( error ) {
        console.log( error )
    }
    // res.send('login')
}

export const register= async (req,res)=>{
    const data = req.body ;
    try {

        //llamalo rows porque sino va a petar
        const { rows } = await pool.query( "select * from Users where email = $1",[data.email])     //hacer la validación al igual que el login
        //si el correo existe en la BD retorna el mensaje de que el email ya esta registrado
        if( rows.length !==0){
            return res.json({mensaje: "This email is already registered"})
        }

        //definimos una constante para verificar la existencia unica de un username
        const checkUsername = await pool.query( "select * from Users where username = $1",[data.username]) 
        //si el username existe en la BD retornar mensaje de que el nombre de usuario ya existe 
        if(checkUsername.rows.length > 0){
            return res.json({mensaje: "This username already exists"})
        }

        //validacion de clave de usuario
        if (data.password !== data.confPassword){
            return res.json({mensaje: ' passwords do not match'})
        }
        //cifrado de clave
        const passwordHash = await bcrypt.hash(data.password,10)  //numero hace referencia al numero de veces que se ejecuta la ejecucion de encriptado
        const {row} = await pool.query("insert into Users (username, email, user_password) VALUES ($1, $2, $3)",[data.username,data.email,passwordHash] ) 
        
        const token = jwt.sign({username:data.username,email:data.email},process.env.SECRET_TOKEN_KEY,{expiresIn: '1d'}) // payload, key ,duracion del token
        return res.status(201).json({success: true, mensaje: 'user registered successfully',token:token})
    } catch (error) {
        console.log(error)
    }
    
    // res.send('register')
} 