const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const FileAttachment = require('../file/FileAttachment');

class Hoax extends Sequelize.Model {}

Hoax.init(
  {
    content: {
      type: Sequelize.STRING,
    },
    timestamp: {
      type: Sequelize.BIGINT,
    },
  },
  {
    sequelize,
    modelName: 'hoax',
    timestamps: false,
  }
);

Hoax.hasOne(FileAttachment, { foreignKey: 'hoaxId', onDelete: 'cascade' });
FileAttachment.belongsTo(Hoax);

module.exports = Hoax;
