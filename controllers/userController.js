const multer = require('multer')
const User = require('../models/userModel')
const AppError = require('../utils/appError')
const catchAsync = require('../utils/catchAsync')
const factory = require('./handlerFactory')
const sharp = require('sharp')


const multerStorage = multer.memoryStorage()

const multerFilter = (req, file, cb) => {
    //Check if file is image
    if (file.mimetype.startsWith('image')) {
        cb(null, true)
    } else {
        cb(new AppError('Not an image! Please upload only images.', 400), false)
    }
}

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
})

exports.uploadUserPhoto = upload.single('photo')

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
    if (!req.file) return next()

    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`

    await sharp(req.file.buffer)
        .resize(500, 500)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/users/${req.file.filename}`) 
    next()
})

const filterObj = (obj, ...allowedFields) => {
    const newObj = {}
    Object.keys(obj).forEach(el => {
        if (allowedFields.includes(el)) {
            newObj[el] = obj[el]
        }
    })
    return newObj
}
exports.createUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'This route is not yet defined. Please use signup instead'
    })
}
exports.getMe = (req, res, next) => {
    req.params.id = req.user.id
    next()
}
exports.updateMe = catchAsync(async (req, res, next) => {
    //1. Create Error if user POSTs password data
    if (req.body.password || req.body.passwordConfirm) {
        return next(new AppError('This route is not password updates. Please use /updateMyPassword', 400))
    }
    //2. Filtered out unwanted field names that are not allowed to be updated
    const filteredBody = filterObj(req.body, 'name', 'email') 
    if (req.file) filteredBody.photo = req.file.filename

    //3. Update user document
    const updateUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
        new: true,
        runValidators: true
    })

    res.status(200).json({
        status: 'success',
        data: {
            user: updateUser
        }
    })
})
exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { active: false }) //set user to false to deactivate account

    res.status(204).json({
        status: 'success',
        data: null
    })
})
exports.getAllUsers = factory.getAll(User)
exports.getUser = factory.getOne(User)
//Do not update password with this, because it uses findByIdAndUpdate so, hooks middleware in models won't work
exports.updateUser = factory.updateOne(User)
exports.deleteUser = factory.deleteOne(User)
