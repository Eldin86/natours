const AppError = require('../utils/appError')

//Handle errors in development mode
const sendErrorDev = (err, req, res) => {
    //A. API
    if (req.originalUrl.startsWith('/api')) {
        return res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack 
        })
    }
    //B. RENDERED WEBSITE
    console.error('ERROR', err)
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong',
        msg: err.message
    })

}
//Handle errors in production mode
const sendErrProd = (err, req, res) => {
    //A. API
    if (req.originalUrl.startsWith('/api')) {
        //A. operational, trusted error, send message to client
        if (err.isOperational) { //if operational error, error we set in appError class
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message,
            })
        }
        //B.programming or other unknown error, don't leak error details
        //1. Log error
        console.error('ERROR', err)
        //2. Send generic message
        return res.status(500).json({
            status: 'error',
            message: 'Something went very wrong'
        })
    }
    //B. RENDERED WEBSITE
    //A. operational, trusted error, send message to client
    //operational, trusted error, send message to client
    if (err.isOperational) {
        return res.status(err.statusCode).render('error', {
            title: 'Something went wrong!',
            msg: err.message
        })
    }
    //B. Programming or other unknown error, don't leak error details
    //1. Log error
    console.error('ERROR', err)
    //2. Send generic message
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: 'Please try again later'
    })


}
//For Mongoose Cast to ObjectId error for production
const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`
    return new AppError(message, 400)
}

//For duplicated inputed fields for production
const handleDuplicateFieldsDB = err => {

    const key = Object.keys(err.keyValue).join('');
    console.log('key', key)
    //console.log(key, err.keyValue[key])
    const message = `The key '${key}' has duplicate value of '${err.keyValue[key]}'`;
    return new AppError(message, 400)
}

//For mongoose validation error
const handleValidationErrorDB = err => {
    //console.log(err)
    //return message from values in errors object
    const errors = Object.values(err.errors).map(el => el.message)
    //console.log('errors',errors)
    const message = `Invalid input data. ${errors.join('. ')}`
    return new AppError(message, 400)
}

//JWT authentication, authorization error handler
const handleJWTError = () => new AppError('Invalid token. Please login again.', 401)

//JWT expiration error handler
const handleExpiredJWT = () => new AppError('Your token is expired, please login.', 401)

//use in app file as middleware
module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500 //default error code
    err.status = err.status || 'error'

    if (process.env.NODE_ENV.trim() === 'development') {//show more error details if in development mode
        sendErrorDev(err, req, res)
    } else if (process.env.NODE_ENV.trim() === 'production') {
        let error = Object.create(err)

        //mongoose operational errors
        if (err.name === 'CastError') error = handleCastErrorDB(error) //CastError related to invalid mongoose ID parameter, identified by name property of Error object
        if (error.code === 11000) error = handleDuplicateFieldsDB(error) //If duplicate field
        if (error._message === 'Validation failed') error = handleValidationErrorDB(error) //Mongoose validation error
        if (error.name === 'JsonWebTokenError') error = handleJWTError()
        if (error.name === 'TokenExpiredError') error = handleExpiredJWT()
        sendErrProd(error, req, res)
    }
}