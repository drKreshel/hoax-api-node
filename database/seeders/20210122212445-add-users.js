const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('P4ssword', 10);
    const users = [];
    for (let i = 0; i < 25; i += 1) {
      users.push({
        username: `user${i + 1}`,
        email: `user${i + 1}@mail.com`,
        inactive: false,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    await queryInterface.bulkInsert('users', users, { raw: true });
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.bulkDelete('users', null, {});
  },
};
