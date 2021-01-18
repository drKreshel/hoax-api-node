const User = require('./user/User');
const Token = require('./auth/Token');

User.hasMany(Token, { onDelete: 'cascade', foreignKey: 'userId' });

module.exports = { User, Token };
