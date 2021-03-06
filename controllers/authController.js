const crypto = require('crypto')
const { promisify } = require('util')
const jwt = require('jsonwebtoken')
const User = require('../models/userModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const Email = require('../utils/email')

const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    )
}
const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id)

    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 10),
        httpOnly: true
    }

    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true 

    res.cookie('jwt', token, cookieOptions)
    //remove password from the output when signup
    user.password = undefined

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    })
}

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        passwordChangedAt: req.body.passwordChangedAt
    })

    const url = `${req.protocol}://${req.get('host')}/me`
    
    await new Email(newUser, url).sendWelcome()

    createSendToken(newUser, 201, res)
})

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body

    //1. Check if email and password exists
    if (!email || !password) {
        return next(new AppError('Please provide email and password'), 400)
    }
    //2. Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password') 

    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect email or password', 401))
    }
    //3. If everything ok, send token to client
    createSendToken(user, 200, res)
})
//Only for rendered pages, no errors! Check if user is logged in
exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            //1. Verify token
            const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET)
            //2. Check if user still exists
            const currentUser = await User.findById(decoded.id)
            if (!currentUser) next()//Just go to next middleware
            //3. Check if user changed password after token was issuded
            if (currentUser.changedPasswordAfter(decoded.iat)) {
                return next()
            }
            //There is a logged in user
            res.locals.user = currentUser 
            return next()
        } catch (error) {
            return next()
        }
    }
    next()//In case of no cookie, no logged in user
}

exports.logout =  (req, res, next) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    })
    res.status(200).json({ status: 'success' })
}

exports.protect = catchAsync(async (req, res, next) => {
    //1. Getting token and check if exists
    let token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {//Check if we have authorization in headers, and authenticate users based on authorization headers
        token = req.headers.authorization.split(' ')[1]
    } else if (req.cookies.jwt) {//else check if we have cookie, and authenticate users based on cookie
        token = req.cookies.jwt
    }
    if (!token) {
        next(new AppError('You are not logged in!, Please login to get access', 401))
    }

    //2. Verify token
    if(token === 'loggedout') return res.redirect('/')

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)
    //3. Check if user still exists
    const currentUser = await User.findById(decoded.id)
    if (!currentUser) next(new AppError('The user does no longer exists', 401))
    //4. Check if user changed password after token was issuded
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(new AppError('User recently changed password. Please login again', 401))
    }
    //5. Grant access to protected route
    req.user = currentUser
    res.locals.user = currentUser 
    next()
})

//Roles controller
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        //Roles are ['admin', 'lead-guide']. role is default as 'user'
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action', 403))
        }
        next()
    }
}

exports.forgotPassword = catchAsync(async (req, res, next) => {
    //1. Get user based on email
    const user = await User.findOne({ email: req.body.email })
    if (!user) {
        return next(new AppError('There is not user with email address', 404))
    }
    //2. Generate random token
    const resetToken = user.createPasswordResetToken()

    await user.save({ validateBeforeSave: false })
    
    try {
        //3. Send it to user's email
        const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`
        await new Email(user, resetURL).sendPasswordReset()
        res.status(200).json({
            status: 'success',
            message: 'Token sent to email.'
        })
    } catch (err) {
        //reset resetToken, and expiresToken
        user.passwordResetToken = undefined
        user.passwordResetExpires = undefined

        await user.save({ validateBeforeSave: false })

        return next(new AppError('There was an error sending the email. Try again leter!', 500))
    }
})

exports.resetPassword = catchAsync(async (req, res, next) => {
    //1. Get user based on token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex') 

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    }) 

    //2. If token has not expired, and there is user, set the new password
    if (!user) {
        return next(new AppError('Token is invalid, or expired', 400))
    }

    user.password = req.body.password
    user.passwordConfirm = req.body.passwordConfirm
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save() 

    //3. Update changedPasswordAt property for the user


    //4. Log the user in. send token
    createSendToken(user, 200, res)
})

exports.updatePassword = catchAsync(async (req, res, next) => {
    //1. Get user from the collection
    const user = await User.findById(req.user.id).select('+password') 
    //2. Check if posted password is correct
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) { 
        return next(new AppError('Your current password is wrong', 401))
    }
    //3. If so, update password
    user.password = req.body.password
    user.passwordConfirm = req.body.passwordConfirm
    await user.save() 

    //4. Log user in, send token
    createSendToken(user, 200, res)
})