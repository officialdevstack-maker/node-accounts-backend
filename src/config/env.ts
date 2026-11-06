import { config } from "dotenv"

config({
    path: ".env"
});

export const { 
  PORT, 
  SESSION_KEY, 
  DB_HOST, 
  DB_NAME, 
  DB_USER, 
  DB_PASS, 
  DB_PORT 
} = process.env;