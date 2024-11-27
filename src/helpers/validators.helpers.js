import { validationResult } from "express-validator";

//this function be a utility for the validators files
const validatedResults = (req,res,next) => {
    const errors = validationResult(req);

    if(!errors.isEmpty()){

        const checkError = errors.array().map(error => error.msg );

        res.status(400).json({
            msg : checkError
        })

        return;
    }

    next();
}

export default validatedResults;