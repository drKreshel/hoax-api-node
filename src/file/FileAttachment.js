const Sequelize = require('sequelize');
const sequelize = require('../config/database');

class FileAttachment extends Sequelize.Model {}
FileAttachment.init(
  {
    filename: {
      type: Sequelize.STRING,
    },
    uploadDate: {
      type: Sequelize.DATE,
    },
    filetype: {
      type: Sequelize.STRING,
    },
  },
  {
    sequelize,
    modelName: 'fileAttachment',
    timestamps: false,
  }
);

module.exports = FileAttachment;
