const dotenv = require('dotenv')
const mongoose = require('mongoose')
dotenv.config({ path: './config.env' }) 

process.on('uncaughtException', err => {
    console.log('UNCAUGHT EXCEPTION, SHUTTING DOWN....')
    console.log(err.name, err.message)
    process.exit(1)
})

const app = require('./app')


mongoose.connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to database')
})

const PORT = process.env.PORT || 3000

const server = app.listen(PORT, () => {
    console.log(`App running on port ${PORT}`)
})

process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION, SHUTTING DOWN....')
    console.log(err.name, err.message)
    server.close(() => {
        process.exit(1)
    })
})


process.on('SIGTERM', () => {
    console.log('SIGTERM RECIVED, Shutting down.')
    server.close(() => {
        console.log('Process terminated!')
    })
})

