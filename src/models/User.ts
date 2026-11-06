// src/models/User.ts
import { DataTypes, Model } from "sequelize"
import db from "../lib/database.js"
// const bcrypt = require('bcryptjs');
import bcrypt from "bcryptjs"


export class User extends Model {
  // `declare` stops TS class fields from shadowing Sequelize's getters/setters
  declare id: number
  declare firstName: string
  declare lastName: string | null

  static {
    this.init(
      {
        fullname: {
          type: DataTypes.STRING,
          allowNull: false,
        },

        email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
        password: { type: DataTypes.STRING, allowNull: false },

        phone: {
            type: DataTypes.STRING,
            allowNull: true,
        },


        account_type: {
            type: DataTypes.ENUM("user", "business" , "developer"),
            defaultValue: 'user'
        }
      },
      {
        sequelize: db,
        defaultScope: { attributes: { exclude: ['password'] } },
    scopes: { withPassword: { attributes: {} as any } },
    hooks: {
      beforeCreate: async (user: any) => {
        user.password = await bcrypt.hash(user.password, 10);
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
    },


      }
    )
  }
}