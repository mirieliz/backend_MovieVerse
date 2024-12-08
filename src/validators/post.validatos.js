import { check } from "express-validator";
import validatedResults from "../helpers/validators.helpers.js";

const validatePost= () =>{
    return [
        // validation for fields
        check('review').notEmpty().withMessage('the review cannot be empty'),
        check('rating').isInt({min:1,max:5}).withMessage('the rating value should be between 1 and 5'),
        check('reaction_post').notEmpty().withMessage('a reaction photo is needed '),
        (req,res,next) => {
            validatedResults(req,res,next)
        }
    ]
}


export default validatePost;