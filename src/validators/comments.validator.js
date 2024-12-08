import { check } from "express-validator";
import validatedResults from "../helpers/validators.helpers.js";

const validateComment= () =>{
    return [
        // validation for fields
        check('user_comment').notEmpty().withMessage("a comment is needed"),
        (req,res,next) => {
            validatedResults(req,res,next)
        }
    ]
}

export default validateComment;