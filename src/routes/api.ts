import "../middleware/kernel.js";
import { Route } from "../lib/core/routing/index.js";
import { authenticationController } from "../controllers/AuthenticationController.js";
import { activityController } from "../controllers/ActivityController.js";
import { changePasswordController } from "../controllers/ChangePasswordController.js";
import { deviceController } from "../controllers/DeviceController.js";
import { forgotPasswordController } from "../controllers/ForgotPasswordController.js";
import { preferenceController } from "../controllers/PreferenceController.js";
import { registerUserController } from "../controllers/RegisterUserController.js";
import { resetPasswordController } from "../controllers/ResetPasswordController.js";
import { verifyRegisteredUserController } from "../controllers/VerifyRegisteredUserController.js";
import { ChangePasswordRequest } from "../requests/ChangePasswordRequest.js";
import { ForgotPasswordRequest } from "../requests/ForgotPasswordRequest.js";
import { RegisterUserRequest } from "../requests/RegisterUserRequest.js";
import { ResetPasswordRequest } from "../requests/ResetPasswordRequest.js";

Route.group({ prefix: "/auth", as: "auth." }, () => {
  Route.post("/login", [authenticationController, "create"]).middleware("throttle:auth").name("login");
  Route.post("/forgot-password", [forgotPasswordController, "create"]).request(ForgotPasswordRequest).middleware("throttle:auth").name("forgot-password");
  Route.post("/reset-password", [resetPasswordController, "create"]).request(ResetPasswordRequest).middleware("throttle:auth").name("reset-password");

  Route.middleware("auth").group(() => {
    Route.get("/preferences", [preferenceController, "show"]).name("preferences.show");
    Route.patch("/preferences", [preferenceController, "update"]).name("preferences.update");
    Route.post("/logout", [authenticationController, "delete"]).name("logout");
    Route.get("/devices", [deviceController, "index"]).name("devices.index");
    Route.post("/devices/logout-others", [deviceController, "destroyOthers"]).name("devices.logout-others");
    Route.delete("/devices/{id}", [deviceController, "destroy"]).whereNumber("id").name("devices.destroy");
    Route.get("/activity", [activityController, "index"]).name("activity.index");
    Route.get("/profile", [authenticationController, "show"]).name("profile");
    Route.post("/verify-email", [verifyRegisteredUserController, "create"]).middleware("throttle:5,1").name("verify-email.send");
    Route.post("/resend-verification", [verifyRegisteredUserController, "create"]).middleware("throttle:5,1").name("verify-email.resend");
    Route.post("/verify-email/confirm", [verifyRegisteredUserController, "store"]).middleware("throttle:10,1").name("verify-email.confirm");
    Route.post("/change-password", [changePasswordController, "update"]).request(ChangePasswordRequest).middleware("throttle:auth").name("change-password");
  });

  Route.post("/register", [registerUserController, "create"]).request(RegisterUserRequest).middleware("throttle:auth").name("register");
});

export const apiV1Route = Route.router();