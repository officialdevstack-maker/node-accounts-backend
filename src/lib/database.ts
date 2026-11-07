import { Sequelize } from "sequelize";
import { DB_HOST, DB_NAME, DB_PORT, DB_USER } from "../config/env.js";


const db =  new Sequelize(
  DB_NAME as string,
  DB_USER as string,
  process.env.DB_PASS,
  {
    host: DB_HOST as string,
    port: Number(DB_PORT),
    dialect: "mysql", // MariaDB (XAMPP) works fine with the mysql dialect
    logging: false,
  }
);

export default db;