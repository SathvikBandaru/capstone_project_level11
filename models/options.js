'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class options extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      options.belongsTo(models.question, {
        foreignKey: "QuestionId",
      });
    }

    static async add(choice, QuestionId) {
      const res = await options.create({
        choice: choice,
        QuestionId: QuestionId,
      });
      return res;
    }

    static async edit(choice, id) {
      const res = await options.update(
        {
          choice: choice,
        },
        {
          where: {
            id: id,
          },
        }
      );
      return res;
    }
  }
  options.init({
    choice: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: true,
      },
    },
  }, {
    sequelize,
    modelName: 'options',
  });
  return options;
};