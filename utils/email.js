const nodemailer = require('nodemailer')
const pug = require('pug')
const { htmlToText } = require('html-to-text')

module.exports = class Email {
    constructor(user, url) {
        this.to = user.email
        this.firstName = user.name.split(' ')[0]
        this.from = `Eldin Maslesa <${process.env.EMAIL_FROM}>`
        this.url = url
    }

    newTransport() {
        if (process.env.NODE_ENV.trim() === 'production') {
            //Sendgrid
            return nodemailer.createTransport({
                service: 'SendGrid',
                auth: {
                    user: process.env.SENDGRID_USERNAME,
                    pass: process.env.SENDGRID_PASSWORD
                }
            })
        }

        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
        })
    }


    //Send the actual email. Recives template and subject
    async send(template, subject) {
        //1. Render HTML based on pug template, and pass data to template
        const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
            fistName: this.firstName,
            url: this.url,
            subject
        })

        //2. Define email options
        const mailOpetions = {
            from: this.from,
            to: this.to,
            subject: subject,
            html,
            text: htmlToText(html) //Strip all tags from elements, and send plain text as email
        }

        //3.Create transport and send email
        this.newTransport()
        await this.newTransport().sendMail(mailOpetions)
    }
    async sendWelcome() {
        await this.send('welcome', 'Welcome to the Natours family!')
    }
    async sendPasswordReset(){
        await this.send('passwordReset', 'Your password reset token (valid only for 10 minutes)')
    }
}