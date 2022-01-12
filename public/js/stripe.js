import axios from 'axios'
const stripe = Stripe('pk_test_51KGRfYJ6K8TNraGb6OS9MuKqa26EGwWo585VPcSrE38XLbO3wqWkaYm6o5YW3bT6dqVZczAQsvHj4bww23pnONOO00oquyGfQb')
import {showAlert} from './alerts'

export const bookTour = async tourId => {
    try {
        //1. Get checkout session from the API
        const session = await axios(`http://localhost:3000/api/v1/bookings/checkout-session/${tourId}`)
        console.log(session)
        //2. Create checkout form + process charge credit card
        await stripe.redirectToCheckout({
            sessionId: session.data.session.id
        })
    } catch (error) {
        console.log(error)
        showAlert('error', error)
    }
}