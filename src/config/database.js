const Sequelize = require('sequelize');
const config = require('config');
require('pg').defaults.parseInt8 = true; // casts BIGINT for sequelize using pg

const { database, username, password, dialect, storage, logging } = config.get('database');
// databases (one for testing and one for development)

const sequelize = new Sequelize(database, username, password, { dialect, storage, logging });

module.exports = sequelize;
