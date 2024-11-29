import { pool } from "../database/connection.database.js";
import { uploadImage } from "../helpers/cloudinary.helpers.js";
import fs from 'fs-extra';

export const createPost = async(req,res) =>{

    const data=req.body;
    try {
        //for upload images
        if(req.files?.reaction_photo){
            //define a variable pic (picture) for upload the phote reaction
            const pic= await uploadImage(req.files.reaction_photo.tempFilePath)
            // console.log(picture)
            console.log(pic.url)
            await fs.unlink(req.files.reaction_photo.tempFilePath)
        }
        const imageReaction = pic.url;
        const {rows} = await pool.query("insert into Post (post_id,review, reaction_photo) VALUES (2, $1, $2)",[data.review,imageReaction] )
        // const {rows} = await pool.query("insert into Post (post_id,review) VALUES (1, $1)",[data.review] )
        // return res.json({msj: 'post created successfully'})
    } catch (error) {
        console.log(error)
    }

    

}