'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class StateElections extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      StateElections.belongsTo(models.admin, {
        foreignKey: "AdminId",
      });
      StateElections.hasMany(models.question, {
        foreignKey: "ElectionId",
      });
      StateElections.hasMany(models.voters, {
        foreignKey: "ElectionId",
      });
    }

    static async add(AdminId, name) {
      const res = await StateElections.create({
        AdminId: AdminId,
        name: name,
        launched: false,
        ended: false,
      });
      return res;
    }

    static async launch(id) {
      const res = await StateElections.update(
        { launched: true },
        {
          where: {
            id: id,
          },
        }
      );
      return res;
    }

    static async end(id) {
      const res = await StateElections.update(
        { ended: true },
        {
          where: {
            id: id,
          },
        }
      );
      return res;
    }
  }
  StateElections.init({
    name: DataTypes.STRING,
    launched: DataTypes.BOOLEAN,
    ended: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'StateElections',
  });
  return StateElections;
};