/**
 * Opaque token
 */
const { randomString } = require('../shared/generator');
const Token = require('./Token');

const createToken = async (user) => {
  const token = randomString(32);
  await Token.create({ token, userId: user.id });
  return token;
};

const verify = async (token) => {
  const dbToken = await Token.findOne({ where: { token } });
  const userId = dbToken.userId;
  return { id: userId };
};

module.exports = { createToken, verify };

/**
 *                  JWT Token
 * good for microservices for easy token share between services,
 * and no need to store token in db
 */
/**
  const jwt = require('jsonwebtoken');

  const createToken = (data) => {
    return jwt.sign(data, 'ultra-dog&superfluos-cat', { expiresIn: 10 }); // we can pass further data in the first object, like role: "admin"
  };

  const verify = (token) => {
    console.log('TOKEN EN VERIFY', token);
    return jwt.verify(token, 'ultra-dog&superfluos-cat');
  };
 */
