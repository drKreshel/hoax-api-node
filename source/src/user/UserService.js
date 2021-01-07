const bcrypt = require('bcrypt');
const User = require('./User');

const save = async (body) => {
  const hashedPassword = await bcrypt.hash(body.password, 10);
  return User.create({ ...body, password: hashedPassword });
};

const findOneByEmail = (email) => User.findOne({ where: { email } });

module.exports = { save, findOneByEmail };
