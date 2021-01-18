const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const Token = require('../auth/Token');

const Model = Sequelize.Model;

class User extends Model {}
User.init(
  {
    username: {
      type: Sequelize.STRING,
    },
    email: {
      type: Sequelize.STRING,
    },
    password: {
      type: Sequelize.STRING,
    },
    inactive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
    activationToken: {
      type: Sequelize.STRING,
    },
  },
  {
    sequelize,
    modelName: 'user',
  }
);


// when user is removed, all tokens from them is removed
// User.hasMany(Token, {
//   foreignKey: 'userId',
//   onDelete: 'cascade',
//   hooks: true,
//   targetKey: 'id',
// });

module.exports = User;
