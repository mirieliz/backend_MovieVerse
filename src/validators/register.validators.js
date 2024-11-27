import { check, validationResult } from "express-validator";
import validatedResults from "../helpers/validators.helpers.js";

const validateUserRegister = () => {
    return [
        // validations for fields
        check('username').exists().notEmpty().withMessage(' username required'), //not empty field
        check('email').exists().notEmpty().withMessage(' email required'),  //not empty field
        check('email').isEmail().withMessage('invalid email'),              //valid email address
        check('password').exists().notEmpty().withMessage(' password required '),   //not empty field
        check('password').isLength({min:4}).withMessage('password is too short'),   //password should be at lest 4 characters

        (req,res,next) => {
            validatedResults(req,res,next)
        }
    ]
}

export default validateUserRegister;