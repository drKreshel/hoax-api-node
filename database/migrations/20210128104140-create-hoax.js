module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('hoaxes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      content: {
        type: Sequelize.STRING,
      },
      timestamp: {
        type: Sequelize.BIGINT,
      },
      // userId: {
      //   type: Sequelize.INTEGER,
      //   references: {
      //     model: 'users',
      //     key: 'id',
      //   },
      //   onDelete: 'cascade',
      // },
    });
  },

  // eslint-disable-next-line no-unused-vars
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('hoaxes');
  },
};
