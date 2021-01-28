const Sequelize = require('sequelize');
const sequelize = require('../config/database');

class Hoax extends Sequelize.Model {}

Hoax.init(
  {
    content: {
      type: Sequelize.STRING,
    },
    timestamp: {
      type: Sequelize.BIGINT,
    }
  },
  {
    sequelize,
    modelName: 'hoax',
    timestamps: false,
  }
);

module.exports = Hoax;
