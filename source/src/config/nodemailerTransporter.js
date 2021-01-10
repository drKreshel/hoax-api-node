const nodemailer = require('nodemailer');
// eslint-disable-next-line import/no-extraneous-dependencies
// const nodemailerStub = require('nodemailer-stub'); replaced with STMPServer

const transporter = nodemailer.createTransport({
  host: 'localhost',
  port: 8587,
  tls: { rejectUnauthorized: false },
});

// transporter debugger. Uncomment to check for errors
/**
transporter.verify(function (error, success) {
  if (error) {
    console.log(error);
  } else {
    console.log('Server is ready to take our messages');
  }
});
* */

module.exports = transporter;
