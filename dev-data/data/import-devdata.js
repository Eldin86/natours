//Load and delete data from database

const fs = require('fs')
const dotenv = require('dotenv')
const mongoose = require('mongoose')
const Tour = require('../../models/tourModel')
const Review = require('../../models/reviewModel')
const User = require('../../models/userModel')

dotenv.config({ path: './config.env' })


const port = process.env.PORT || 3000
mongoose.connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then((con) => {
}).catch(e => console.log(`DB CONNECTION ERROR$ ${e}`))

//Read json file
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'))
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'))
const reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'))

//import data into db
const importData = async () => {
    try {
        await Tour.create(tours)
        await User.create(users, {validateBeforeSave: false}) //validateBeforeSave: false, So we don't get error when creating/importing new users
        await Review.create(reviews)
        console.log('Data loaded!')
        process.exit()
    } catch (err) {
        console.log(err)
    }
}

//Delete data from collection
const deleteData = async () => {
    try {
        await Tour.deleteMany()
        await User.deleteMany()
        await Review.deleteMany()
        console.log('Data deleted!')
        process.exit() //process i dalje je pokrenut pa ga moramo i zatvoriti nakon operacije sto je zavrsena, agresivni nacin zaustavljanja aplikacije
    } catch (err) {
        console.log(err)
    }
}

//node dev-data/data/import-devdata.js --import or --delete
if(process.argv[2] === '--import'){
    importData()
}else if(process.argv[2] === '--delete'){
    deleteData()
}
console.log(process.argv)