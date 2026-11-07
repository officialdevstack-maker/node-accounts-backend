// src/models/AccessToken.ts
import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize"
import db from "../lib/database.js"


export class AccessToken extends Model<
  InferAttributes<AccessToken>,
  InferCreationAttributes<AccessToken>
> {
  // `declare` stops TS class fields from shadowing Sequelize's getters/setters
  declare id: CreationOptional<number>;
  declare userId: number;
  declare tokenHash: string;
  declare expiresAt: Date | null;
  declare lastUsedAt: CreationOptional<Date | null>;
  
  static {
    this.init(
      {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: "user_id" },
    tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: "token_hash" },
    expiresAt: { type: DataTypes.DATE, allowNull: true, field: "expires_at" },
    lastUsedAt: { type: DataTypes.DATE, allowNull: true, field: "last_used_at" },
  },
  {
    sequelize: db,
    tableName: "access_tokens",
    indexes: [{ fields: ["user_id"] }],
  }
)
  }
}