const transporter = require('../config/nodemailerTransporter');

const sendAccountActivation = async (email, token) => {
  await transporter.sendMail({
    from: 'My app <info@myApp.com>',
    to: email,
    subject: 'Account activation - Hoaxify',
    html: `Token: ${token}`,
  });
};

module.exports = { sendAccountActivation };
