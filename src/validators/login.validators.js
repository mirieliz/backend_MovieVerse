import { check } from "express-validator";
import validatedResults from "../helpers/validators.helpers.js";

const validateUserLogin = () =>{
    return [
        // validation for fields
        check('email').exists().notEmpty().withMessage('required credential'),  //email cannot be empty
        check('email').isEmail().withMessage('invalid email'),                  //email must be in a valid format
        check('password').exists().notEmpty().withMessage('required credential'),   //password cannot be empty
        (req,res,next) => {
            validatedResults(req,res,next)
        }
    ]
}


export default validateUserLogin;

