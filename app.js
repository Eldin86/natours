const path = require('path')
const rateLimit = require('express-rate-limit').default
const express = require('express')
const morgan = require('morgan')
const helmet = require('helmet')
const mongoSanitize = require('express-mongo-sanitize')
const xss = require('xss-clean')
const hpp = require('hpp')
const AppError = require('./utils/appError')
const globalErrorHandler = require('./controllers/errorController')
const cookieParser = require('cookie-parser')
const compression = require('compression')
const tourRouter = require('./routes/tourRoutes')
const userRouter = require('./routes/userRoutes')
const reviewRouter = require('./routes/reviewRoutes')
const bookingRouter = require('./routes/bookingRoutes')
const viewRouter = require('./routes/viewRoutes')

//Start express app
const app = express()

app.enable('true proxy')

//Setup pug engine
app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'))

//GLOBAL MIDDLEWARES
//Serving static files
app.use(express.static(path.join(__dirname, 'public')))

//Set security http headers
app.use(helmet())
app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'", 'data:', 'blob:', 'https:', 'ws:'],
          baseUri: ["'self'"],
          fontSrc: ["'self'", 'https:', 'data:'],
          scriptSrc: [
            "'self'",
            'https:',
            'http:',
            'blob:',
            'https://*.mapbox.com',
            'https://js.stripe.com',
            'https://m.stripe.network',
            'https://*.cloudflare.com',
          ],
          frameSrc: ["'self'", 'https://js.stripe.com'],
          objectSrc: ["'none'"],
          styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
          workerSrc: [
            "'self'",
            'data:',
            'blob:',
            'https://*.tiles.mapbox.com',
            'https://api.mapbox.com',
            'https://events.mapbox.com',
            'https://m.stripe.network',
          ],
          childSrc: ["'self'", 'blob:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          formAction: ["'self'"],
          connectSrc: [
            "'self'",
            "'unsafe-inline'",
            'data:',
            'blob:',
            'https://*.stripe.com',
            'https://*.mapbox.com',
            'https://*.cloudflare.com/',
            'https://bundle.js:*',
            'ws://127.0.0.1:*/',
   
          ],
          upgradeInsecureRequests: [],
        },
      },
    })
  );

//Development logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
}
//Limit requests from same API
const limiter = rateLimit({
    max: 100, //Allow 100 requests from same IP from in 1h
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour!'
})
app.use('/api', limiter) 


app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({extended: true, limit: '10kb'}))
app.use(cookieParser())

//Data sanatization against noSQL query injection
app.use(mongoSanitize())

//Data sanatization against XSS
app.use(xss()) //clean any malicius user input from html code

//Pervent parameter polution
app.use(hpp({
    whitelist: [
        'duration',
        'ratingsQuantity',
        'ratingsAverage',
        'maxGroupSize',
        'difficulty',
        'price'] //allow duplicated fields
}))
app.use(compression())

//ROUTES
app.use('/', viewRouter) //PUG templates
app.use('/api/v1/tours', tourRouter)
app.use('/api/v1/users', userRouter)
app.use('/api/v1/reviews', reviewRouter)
app.use('/api/v1/bookings', bookingRouter)

//Unhandled routes handler
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404))
})

app.use(globalErrorHandler)

module.exports = app