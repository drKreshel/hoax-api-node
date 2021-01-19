const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const User = require('./User');
const EmailService = require('../email/EmailService');
const EmailException = require('../email/EmailException');
const sequelize = require('../config/database');
const InvalidTokenException = require('./InvalidTokenException');
const NotFoundException = require('../error/NotFoundException');
const TokenService = require('../auth/TokenService');

const { randomString } = require('../shared/generator');

const getUserByEmail = (email) => User.findOne({ where: { email } });

const postUser = async (body) => {
  const { username, email, password } = body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { username, email, password: hashedPassword, activationToken: randomString(32) };
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

/** //* Variant: Without using sequelize transaction, just plain js
   const save = async (body) => {
    const { username, email, password } = body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = { username, email, password: hashedPassword, activationToken: generateToken(16) };
    let createUser = true;
    try {
      await EmailService.sendAccountActivation(email, user.activationToken);
    } catch {
      createUser = false;
      throw new EmailException();
    }
    if (createUser) await User.create(user); // not passing "inactive property"
  };
 */

const activateAccount = async (token) => {
  const user = await User.findOne({ where: { activationToken: token } });
  if (!user) {
    throw new InvalidTokenException();
  }
  user.inactive = false;
  user.activationToken = null;
  await user.save();
};

const getUsers = async ({ page, size, authenticatedUser }) => {
  const whereQuery = { inactive: false };
  if (authenticatedUser) {
    whereQuery.id = { [Op.not]: authenticatedUser.id };
  }
  /** another nice way of doing the above would be setting id=0 in case authenticatedUser does not exist
   * but this does increase query time */
  const users = await User.findAndCountAll({
    where: whereQuery,
    offset: size * page,
    limit: size,
    attributes: ['id', 'username', 'email'],
  });
  const content = users.rows;
  const totalPages = Math.ceil(users.count / size);
  return { content, page, size, totalPages };
};

const getUser = async (id) => {
  const user = await User.findOne({
    where: { id, inactive: false },
    attributes: ['id', 'username', 'email'],
  });
  if (!user) throw new NotFoundException('user_not_found');
  return user;
};

const updateUser = (id, body) => {
  return User.update(body, { where: { id } }); // {returning: true} only works with postgres (psql)
};

const deleteUser = (id) => {
  return User.destroy({ where: { id } });
  /** This code is for destroying Tokens manually. (On Delete cascade in model
   *  wasn't working properly before)
   */
  //* return Promise.all([
  //*   User.destroy({ where: { id } }),
  //*   TokenService.deleteAllTokensFromUser(id)
  //* ])
};

const passwordReset = async (email) => {
  const user = await getUserByEmail(email);
  if (!user) {
    throw new NotFoundException('email_not_found');
  }
  user.passwordResetToken = randomString(16);
  await user.save();
  try {
    await EmailService.sendPasswordReset(email, user.passwordResetToken);
  } catch (error) {
    throw new EmailException();
  }
};

const updatePassword = async (request) => {
  console.log(await User.findAll());
  const hashedPassword = await bcrypt.hash(request.password, 10);
  // Method 1 instance save (SELECT + UPDATE + SELECT (3 operations))
  // const user = await User.findOne({ where: { passwordResetToken: request.passwordResetToken } });
  // user.password = hashedPassword;
  // user.passwordResetToken = null;
  // user.inactive = false;
  // user.activationToken = null;
  // await user.save();

  // Method 2 instance update (SELECT + UPDATE + SELECT (3 operations))
  const user = await User.findOne({ where: { passwordResetToken: request.passwordResetToken } });
  await user.update({
    password: hashedPassword,
    passwordResetToken: null,
    inactive: false,
    activationToken: null,
  });

  // Method 3 update Model (UPDATE AND SELECT, 2 operations)
  // await User.update(
  //   { password: hashedPassword, passwordResetToken: null, inactive: false, activationToken: null },
  //   { where: { passwordResetToken: request.passwordResetToken } }
  // );
  await TokenService.deleteAllTokensFromUser(user.id);
};

const findUserByToken = (passwordResetToken) => {
  return User.findOne({
    where: { passwordResetToken },
  });
};

module.exports = {
  postUser,
  getUserByEmail,
  activateAccount,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  passwordReset,
  updatePassword,
  findUserByToken,
};
