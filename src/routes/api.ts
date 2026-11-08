import "../middleware/kernel.js";
import { Route } from "../lib/core/routing/index.js";
import { authenticationController } from "../controllers/AuthenticationController.js";
import { registerUserController } from "../controllers/RegisterUserController.js";
import { verifyRegisteredUserController } from "../controllers/VerifyRegisteredUserController.js";
import { RegisterUserRequest } from "../requests/RegisterUserRequest.js";

Route.group({ prefix: "/auth", as: "auth." }, () => {
  Route.post("/login", [authenticationController, "create"]).middleware("throttle:auth").name("login");

  Route.middleware("auth").group(() => {
    Route.post("/logout", [authenticationController, "delete"]).name("logout");
    Route.get("/profile", [authenticationController, "show"]).name("profile");
    Route.post("/verify-email", [verifyRegisteredUserController, "create"]).middleware("throttle:5,1").name("verify-email.send");
    Route.post("/resend-verification", [verifyRegisteredUserController, "create"]).middleware("throttle:5,1").name("verify-email.resend");
    Route.post("/verify-email/confirm", [verifyRegisteredUserController, "store"]).middleware("throttle:10,1").name("verify-email.confirm");
  });

  Route.post("/register", [registerUserController, "create"]).request(RegisterUserRequest).middleware("throttle:auth").name("register");
});

export const apiV1Route = Route.router();