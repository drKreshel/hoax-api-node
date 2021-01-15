const Sequelize = require('sequelize');
const sequelize = require('../config/database');

// opaque token model
class Token extends Sequelize.Model {}
Token.init(
  {
    token: {
      type: Sequelize.STRING,
    },
    userId: {
      type: Sequelize.INTEGER,
    },
  },
  {
    sequelize,
    modelName: 'token',
  }
);

module.exports = Token;
