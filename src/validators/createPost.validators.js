import { check } from "express-validator";
import validatedResults from "../helpers/validators.helpers.js";

const validatePost = () =>{
    return [
        check('review').exists().notEmpty().withMessage('you should add a review'), //review field cannot be empty
        (req,res,next) => {
            validatedResults(req,res,next)
        }
    ]
}

export default validatePost;