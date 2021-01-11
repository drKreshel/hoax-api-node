const nodemailer = require('nodemailer');
const transporter = require('../config/nodemailerTransporter');

const sendAccountActivation = async (email, token) => {
  const info = await transporter.sendMail({
    from: 'My app <info@myApp.com>',
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
  if (process.env.NODE_ENV === 'development') {
    console.log(nodemailer.getTestMessageUrl(info));
  }
};

module.exports = { sendAccountActivation };
