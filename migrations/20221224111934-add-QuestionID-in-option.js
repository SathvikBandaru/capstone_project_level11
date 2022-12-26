'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  await queryInterface.addColumn("options", "QuestionId", {
      type: Sequelize.DataTypes.INTEGER,
    });

    await queryInterface.addConstraint("options", {
    fields: ["QuestionId"],
      type: "foreign key",
      references: {
        table: "questions",
        field: "id",
      },
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  await queryInterface.removeColumn("options", "QuestionId");
  },
};

