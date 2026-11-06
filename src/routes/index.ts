import { Router } from "express";
import { authRouter } from "./AuthenticationRoute.js";
import { RegisterUserRoute } from "./RegisterUserRoute.js";
export const router = Router();

router.use("/auth", authRouter);
router.use("/auth", RegisterUserRoute);
export const apiV1Route = router;