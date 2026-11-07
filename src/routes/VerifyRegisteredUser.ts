import { Router } from "express";
import { verifyRegisteredUserController } from "../controllers/VerifyRegisteredUserController.js";
export const verifyRegisteredUserRoute = Router()


verifyRegisteredUserRoute.post("/verify-email", verifyRegisteredUserController.create)