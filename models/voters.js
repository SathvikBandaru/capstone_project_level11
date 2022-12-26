'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class voters extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      voters.belongsTo(models.StateElections, {
        foreignKey: "ElectionId",
      });
    }

    static async add(VoterId, Password, ElectionId) {
      const res = await voters.create({
        VoterId: VoterId,
        Password: Password,
        ElectionId: ElectionId,
        status: false,
        responses: [],
      });
      return res;
    }

    static async delete(VoterId) {
      const res = await voters.destroy({
        where: {
          id: VoterId,
        },
      });
      return res;
    }

    static async markVoted(id) {
      const res = await voters.update(
        {
          status: true,
        },
        {
          where: {
            id: id,
          },
        }
      );
      return res;
    }

    static async addResponse(id, response) {
      const res = await voters.update(
        {
          responses: response,
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
  voters.init({
    VoterId: DataTypes.STRING,
    Password: DataTypes.STRING,
    status: DataTypes.BOOLEAN,
    responses: DataTypes.ARRAY(DataTypes.INTEGER),

  }, {
    sequelize,
    modelName: 'voters',
  });
  return voters;
};