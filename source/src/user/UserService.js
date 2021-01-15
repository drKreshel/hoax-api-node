const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const User = require('./User');
const EmailService = require('../email/EmailService');
const EmailException = require('../email/EmailException');
const sequelize = require('../config/database');
const InvalidTokenException = require('./InvalidTokenException');
const UserNotFoundException = require('./UserNotFoundException');
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
  if (!user) throw new UserNotFoundException();
  return user;
};

const updateUser = (id, body) => {
  return User.update(body, { where: { id } }); // {returning: true} only works with postgres (psql)
};

module.exports = { postUser, getUserByEmail, activateAccount, getUsers, getUser, updateUser };
