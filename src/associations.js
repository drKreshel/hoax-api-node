const User = require('./user/User');
const Token = require('./auth/Token');
const Hoax = require('./hoax/Hoax');

User.hasMany(Token, { onDelete: 'cascade', foreignKey: 'userId' });
User.hasMany(Hoax, { onDelete: 'cascade', foreignKey: 'userId' });

Hoax.belongsTo(User);

module.exports = { User, Token, Hoax };
