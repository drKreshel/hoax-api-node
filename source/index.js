const bcrypt = require('bcrypt');

const app = require('./src/app');
const sequelize = require('./src/config/database');
const User = require('./src/user/User');
const TokenService = require('./src/auth/TokenService');

const postUsers = async (n, m = 0) => {
  const hashedPassword = await bcrypt.hash('P4ssword', 10);
  // n: "amount of active users to post" / m: amunt of inactive users
  const usersArr = [];
  for (let i = 0; i < n + m; i += 1) {
    usersArr.push({
      username: `user${i + 1}`,
      email: `user${i + 1}@mail.com`,
      inactive: i >= n,
      password: hashedPassword,
    });
  }
  return User.bulkCreate(usersArr, { raw: true }); // raw: akind ".lean()"" from mongodb
};

sequelize.sync({ force: true }).then(async () => {
  await postUsers(25);
});

TokenService.scheduledCleanup();
app.listen(3000, () => console.log('SERVER RUNNING AT PORT 3000'));

module.exports = app;
