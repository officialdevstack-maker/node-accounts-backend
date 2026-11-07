import { Route } from "../lib/core/routing/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { authenticationController } from "../controllers/AuthenticationController.js";
import { registerUserController } from "../controllers/RegisterUserController.js";
import { verifyRegisteredUserController } from "../controllers/VerifyRegisteredUserController.js";

Route.group({ prefix: "/auth", as: "auth." }, () => {
  Route.post("/login", [authenticationController, "create"]).name("login");
  Route.get("/logout", [authenticationController, "delete"]).middleware(authMiddleware).name("logout");
  Route.get("/profile", [authenticationController, "show"]).middleware(authMiddleware).name("profile");
  Route.post("/register", [registerUserController, "create"]).name("register");
});

Route.post("/verify-email", [verifyRegisteredUserController, "create"]).name("verify-email");

export const apiV1Route = Route.router();