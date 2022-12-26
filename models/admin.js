'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class admin extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      admin.hasMany(models.StateElections, {
        foreignKey: "AdminId",
      });
    }

    static createAdmin(name, Email, password) {
      return this.create({
        name,
        Email,
        password,
      });
    }
  }
  admin.init({
    name: DataTypes.STRING,
    Email: DataTypes.STRING,
    password: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'admin',
  });
  return admin;
};