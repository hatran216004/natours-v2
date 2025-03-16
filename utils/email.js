const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const htmlToText = require('html-to-text');
const nodemailer = require('nodemailer');

const pathName = path.join(__dirname, '../views/email/styles.css');
const myCss = fs.readFileSync(pathName, 'utf-8');

class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.from = `Ha Tran <${process.env.EMAIL_FROM}>`;
    this.url = url;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        service: 'SendinBlue',
        auth: {
          user: process.env.SENDINLUE_USERNAME,
          pass: process.env.SENDINLUE_PASSWORD
        }
      });
    }
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async send(template, subject) {
    const html = await ejs.renderFile(
      `${__dirname}/../views/email/${template}.ejs`,
      {
        firstName: this.firstName,
        url: this.url,
        subject,
        myCss
      }
    );

    const emailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.convert(html, {
        wordwrap: false
      })
    };
    await this.newTransport().sendMail(emailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours Family!');
  }

  async sendResetPassword() {
    await this.send(
      'password-reset',
      'Your password reset token (valid for only 10 minutes)!'
    );
  }
}

module.exports = Email;
