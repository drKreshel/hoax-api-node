const Sequelize = require('sequelize');
const sequelize = require('../config/database');
// opaque token model
const Model = Sequelize.Model;
class Token extends Model {}
Token.init(
  {
    token: {
      type: Sequelize.STRING,
    },
    lastUsedAt: {
      type: Sequelize.DATE,
    },
    userId: {
      type: Sequelize.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'cascade',
    },
  },
  {
    sequelize,
    modelName: 'token',
    timestamps: false,
  }
);

module.exports = Token;
