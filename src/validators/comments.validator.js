import { check } from "express-validator";
import validatedResults from "../helpers/validators.helpers.js";

const validateComment= () =>{
    return [
        // validation for fields
        check('comment').notEmpty().withMessage("a comment is needed").isLength({min:3}).withMessage("your comments should have al least 3 letters"),
        (req,res,next) => {
            validatedResults(req,res,next)
        }
    ]
}

export default validateComment;