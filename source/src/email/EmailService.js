const nodemailer = require('nodemailer');
const transporter = require('../config/nodemailerTransporter');
const logger = require('../shared/logger');

let fromEmail = 'My app <info@myApp.com>';
if (process.env.NODE_ENV === 'production') {
  fromEmail = 'juanloza877@gmail.com';
}

const sendAccountActivation = async (email, token) => {
  const info = await transporter.sendMail({
    from: fromEmail,
    to: email,
    subject: 'Account activation - Hoaxify',
    html: `
    <div>
      <b> Please click below link to activate your accout </b>
    </div>
    <div>
      <a href="http://localhost:8080/#/login?token=${token}"> Activate </a> 
    </div>`,
  });
  logger.info(nodemailer.getTestMessageUrl(info));
};

const sendPasswordReset = async (email, token) => {
  const info = await transporter.sendMail({
    from: fromEmail,
    to: email,
    subject: 'Password reset - Hoaxify',
    html: `
    <div>
      <b> Please click below link to reset your password </b>
    </div>
    <div>
      <a href="http://localhost:8080/#/password-reset?reset=${token}"> Reset password </a> 
    </div>`,
  });
  logger.info(nodemailer.getTestMessageUrl(info));
};

module.exports = { sendAccountActivation, sendPasswordReset };
