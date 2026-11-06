import { Router } from "express";
import { registerUserController } from "../controllers/RegisterUserController.js";
import validateRequest from "../middleware/request-validation.js";
export const RegisterUserRoute = Router()


RegisterUserRoute.post("/register", registerUserController.create)
