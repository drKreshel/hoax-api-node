/**
 * Opaque token
 */
const { Op } = require('sequelize');
const { randomString } = require('../shared/generator');
const { Token } = require('../associations');

const ONE_WEEK_IN_MILLIS = 7 * 24 * 60 * 60 * 1000;
const createToken = async (user) => {
  const token = randomString(32);
  if (user.id) {
    await Token.create({
      token,
      userId: user.id,
      lastUsedAt: Date.now(),
    });
  }
  return token;
};
let counter = 0;
const verify = async (token) => {
  console.log('🚀 ~ file: TokenService.js ~ line 22 ~ verify ~ token', token);
  const oneWeekAgo = new Date(Date.now() - ONE_WEEK_IN_MILLIS);
  const dbToken = await Token.findOne({
    where: {
      token,
      lastUsedAt: { [Op.gt]: oneWeekAgo },
    },
  });
  console.log(`🚀 ~ file: TokenService.js ~ line 29 ~ verify ~ dbToken ${counter++}`, dbToken);

  dbToken.lastUsedAt = new Date();
  await dbToken.save();
  const userId = dbToken.userId;
  return { id: userId };
};

const deleteToken = async (token) => {
  await Token.destroy({ where: { token } });
};

const scheduledCleanup = () => {
  setInterval(async () => {
    const oneWeekAgo = new Date(Date.now() - ONE_WEEK_IN_MILLIS);
    await Token.destroy({
      where: {
        lastUsedAt: { [Op.lt]: oneWeekAgo },
      },
    });
  }, 60 * 60 * 1000); // 1 hour
};

// not being used for now
const deleteAllTokensFromUser = (userId) => {
  return Token.destroy({ where: { userId } });
};

module.exports = { createToken, verify, deleteToken, deleteAllTokensFromUser, scheduledCleanup };

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
    return jwt.verify(token, 'ultra-dog&superfluos-cat');
  };
 */
