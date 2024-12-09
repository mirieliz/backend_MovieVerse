import { check } from "express-validator";
import validatedResults from "../helpers/validators.helpers.js";

const validatePassword= () =>{
    return [
        // validation for fields
        check('currentPassword').notEmpty().withMessage("this field cannot be empty"),
        check('newPassword').notEmpty().isLength({min:4}).withMessage("your password should have al least 4 characters"),
        check('confirmNewPassword').notEmpty().isLength({min:4}).withMessage("your password should have al least 4 characters"),
        (req,res,next) => {
            validatedResults(req,res,next)
        }
    ]
}

export default validatePassword;