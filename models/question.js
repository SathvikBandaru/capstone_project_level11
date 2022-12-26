'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class question extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      question.belongsTo(models.StateElections, {
        foreignKey: "ElectionId",
      });
      question.hasMany(models.options, {
        foreignKey: "QuestionId",
      });
    }

    static async add(title, description, ElectionId) {
      const res = await question.create({
        title: title,
        description: description,
        ElectionId: ElectionId,
      });
      return res;
    }

    static async edit(title, description, QuestionId) {
      const res = await question.update(
        {
          title: title,
          description: description,
        },
        {
          where: {
            id: QuestionId,
          },
        }
      );
      return res;
    }
  }
  question.init({
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: true,
      },
    },
    description: DataTypes.STRING,
  },
  {
    sequelize,
    modelName: 'question',
  });
  return question;
};