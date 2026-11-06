// app.ts
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import { PORT } from "./config/env.js";
import { apiV1Route } from "./routes/index.js";
import db from "./lib/database.js";
import Auth from "./lib/auth/index.js";
import { errorHandler, notFound } from "./middleware/error.js";

const app = express();

// 1. global middleware (order matters)
app.use(cors({ origin: true, credentials: true })); // restrict origin in production
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(Auth.initialize); // must come after cookieParser

// 2. routes
app.use("/api", apiV1Route);

// 3. these two must be last
app.use(notFound);
app.use(errorHandler);

// 4. start only after the database is ready
async function bootstrap() {
  try {
    await db.authenticate();
    await db.sync();

    app.listen(PORT, () => {
      console.log(`Backend server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Unable to start server:", err);
    process.exit(1);
  }
}

bootstrap();