const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('./User');
const EmailService = require('../email/EmailService');
const EmailException = require('../email/EmailException');
const sequelize = require('../config/database');
const InvalidTokenException = require('./InvalidTokenException');

const generateToken = (length) => crypto.randomBytes(length / 2).toString('hex');
const findOneByEmail = (email) => User.findOne({ where: { email } });

const save = async (body) => {
  const { username, email, password } = body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { username, email, password: hashedPassword, activationToken: generateToken(16) };
  const transaction = await sequelize.transaction();
  await User.create(user, { transaction }); // not passing "inactive property"
  try {
    await EmailService.sendAccountActivation(email, user.activationToken);
    transaction.commit();
  } catch (err) {
    transaction.rollback();
    throw new EmailException();
  }
};

const activateAccount = async (token) => {
  const user = await User.findOne({ where: { activationToken: token } });
  if (!user) {
    throw new InvalidTokenException();
  }
  user.inactive = false;
  user.activationToken = null;
  await user.save();
};
//* Variant: Without using sequelize transaction, just plain js
// const save = async (body) => {
//   const { username, email, password } = body;
//   const hashedPassword = await bcrypt.hash(password, 10);
//   const user = { username, email, password: hashedPassword, activationToken: generateToken(16) };
//   let createUser = true;
//   try {
//     await EmailService.sendAccountActivation(email, user.activationToken);
//   } catch {
//     createUser = false;
//     throw new EmailException();
//   }
//   if (createUser) await User.create(user); // not passing "inactive property"
// };

module.exports = { save, findOneByEmail, activateAccount };
