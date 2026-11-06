import { Router } from "express";
import { authenticationController } from "../controllers/AuthenticationController.js";
import { authMiddleware } from "../middleware/auth.js";
export const authRouter = Router()


authRouter.post("/login", authenticationController.create)

authRouter.post('/logout', authenticationController.delete);

authRouter.get("/profile", authMiddleware, authenticationController.show)