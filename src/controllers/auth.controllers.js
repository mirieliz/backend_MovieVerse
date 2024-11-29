import { pool } from "../database/connection.database.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { uploadImage } from "../helpers/cloudinary.helpers.js";
import fs from 'fs-extra';

export const login= async (req,res)=>{
    
    // const row = await pool.query("select * from usuario")
    // res.json(row)
    const data = req.body;

    try {
        //llamalo rows porque sino va a petar
        const { rows } = await pool.query( "select * from Users where email = $1",[data.email])
        if( rows.length ===0){
            return res.json({mensaje: "credential not found"})
        }
        const emailMatch= rows[0].email
        if(data.email!==emailMatch){
            return res.json({errors: "this" })
        }
        // else{
        //     return res.json({mensaje: "usuario encontrado"})
        // }
        const hashPassword = rows[0].user_password
        // console.log(hashPassword)
        const validatePassword = await bcrypt.compare(data.password, hashPassword)

        if(validatePassword===false){
            return res.json({mensaje: "invalid credential "})
        }

        //traemos el username del usuario
        const idUser = rows[0].username
        //asignacion de JWT con los parametros username and email
        const token = jwt.sign({username:idUser,email:data.email},process.env.SECRET_TOKEN_KEY,{expiresIn: '1d'}) // payload, key ,duracion del token
        return res.json({mensaje: 'user logged successfully',token:token})



    } catch ( error ) {
        console.log( error )
    }
    // res.send('login')
}

export const register= async (req,res)=>{
    const data = req.body ;
    try {

        //llamalo rows porque sino va a petar
        const { rows } = await pool.query( "select * from Users where email = $1",[data.email])
        //si el correo existe en la BD retorna el mensaje de que el email ya esta registrado
        if( rows.length !==0){
            return res.json({mensaje: "This email is already registered"})
        }

        //validacion de clave de usuario
        if (data.password !== data.confPassword){
            return res.json({mensaje: ' passwords do not match'})
        }
        //cifrado de clave
        const passwordHash = await bcrypt.hash(data.password,10)  //numero hace referencia al numero de veces que se ejecuta la ejecucion de encriptado
        const {row} = await pool.query("insert into Users (username, email, user_password) VALUES ($1, $2, $3)",[data.username,data.email,passwordHash] ) 
        
        const token = jwt.sign({username:data.username,email:data.email},process.env.SECRET_TOKEN_KEY,{expiresIn: '1d'}) // payload, key ,duracion del token
        return res.json({mensaje: 'user registered successfully',token:token})
    } catch (error) {
        console.log(error)
    }
    
    // res.send('register')
}