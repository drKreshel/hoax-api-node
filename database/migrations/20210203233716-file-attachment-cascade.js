module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const constraints = await queryInterface.getForeignKeysForTables(['fileAttachments']);
      /* #REGION - Remove contraints */
      // For some reason postreSQL migration is not working properly, adding a new constraint on each run, so with this block we are removing all constraints and then adding a new one
      for (let i = 0; i < constraints.fileAttachments.length; i++) {
        const constraintName = constraints.fileAttachments[i];
        if (constraintName.includes('hoaxId')) {
          await queryInterface.removeConstraint('fileAttachments', constraintName, { transaction });
        }
      }
      /* #endregion */

      await queryInterface.addConstraint('fileAttachments', {
        fields: ['hoaxId'],
        type: 'foreign key',
        references: { table: 'hoaxes', field: 'id' },
        onDelete: 'cascade',
        transaction,
      });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const constraints = await queryInterface.getForeignKeysForTables(['fileAttachments']);
      /* #REGION - Remove contraints */
      for (let i = 0; i < constraints.fileAttachments.length; i++) {
        const constraintName = constraints.fileAttachments[i];
        if (constraintName.includes('hoaxId')) {
          await queryInterface.removeConstraint('fileAttachments', constraintName, { transaction });
        }
      }
      /* #endregion */

      await queryInterface.addConstraint('fileAttachments', {
        fields: ['hoaxId'],
        type: 'foreign key',
        references: { table: 'hoaxes', field: 'id' },
        transaction,
      });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
    }
  },
};
