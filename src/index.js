import express from 'express';
import { serverConfig } from './config/server.config.js';
// import { pool } from './database/connection.database.js';
import authRoute from './routes/auth.routes.js';
import createPost from './routes/post.routes.js';
import addFavorite  from './routes/user.routes.js';
import cors from 'cors';
import filegestor from 'express-fileupload';

const {port} = serverConfig;

const app = express();  
//middleware
app.use(express.json());
app.use(cors());
//images gestor
app.use(filegestor({
    useTempFiles : true,
    tempFileDir : './tmp'
}));
//everything you need put down 
app.use(authRoute);
app.use(createPost);
app.use(addFavorite)
//prueba de conexion 
app.get('/ping',(req,res)=>{
    return res.status(200).json({mensaje: 'pong'})
})

// app.get('/user', async (req,res)=>{
    
//     try {
//         const {row} = await pool.query('select * from usuario');
//         res.send(row)
//     } catch (error) {
//         console.log(error)
//     }
// })

app.listen(port,()=> {
    console.log(`server on port = ${port} `)    //identificacion del puerto
})