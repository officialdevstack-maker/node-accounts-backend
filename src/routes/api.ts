import "../middleware/kernel.js";
import express from "express";
import { Route } from "../lib/core/routing/index.js";
import { authenticationController } from "../controllers/AuthenticationController.js";
import { activityController } from "../controllers/ActivityController.js";
import { avatarController } from "../controllers/AvatarController.js";
import { changePasswordController } from "../controllers/ChangePasswordController.js";
import { connectedAppController } from "../controllers/ConnectedAppController.js";
import { deviceController } from "../controllers/DeviceController.js";
import { forgotPasswordController } from "../controllers/ForgotPasswordController.js";
import { internalUserController } from "../controllers/InternalUserController.js";
import { oidcController } from "../controllers/OidcController.js";
import { preferenceController } from "../controllers/PreferenceController.js";
import { privacyController } from "../controllers/PrivacyController.js";
import { registerUserController } from "../controllers/RegisterUserController.js";
import { resetPasswordController } from "../controllers/ResetPasswordController.js";
import { verifyRegisteredUserController } from "../controllers/VerifyRegisteredUserController.js";
import { ChangePasswordRequest } from "../requests/ChangePasswordRequest.js";
import { DeleteAccountRequest } from "../requests/DeleteAccountRequest.js";
import { ForgotPasswordRequest } from "../requests/ForgotPasswordRequest.js";
import { RegisterUserRequest } from "../requests/RegisterUserRequest.js";
import { ResetPasswordRequest } from "../requests/ResetPasswordRequest.js";
import { UpdateProfileRequest } from "../requests/UpdateProfileRequest.js";

Route.group({ prefix: "/auth", as: "auth." }, () => {
  Route.post("/login", [authenticationController, "create"]).middleware("throttle:auth").name("login");
  Route.post("/forgot-password", [forgotPasswordController, "create"]).request(ForgotPasswordRequest).middleware("throttle:auth").name("forgot-password");
  Route.post("/reset-password", [resetPasswordController, "create"]).request(ResetPasswordRequest).middleware("throttle:auth").name("reset-password");
  Route.get("/avatars/{file}", [avatarController, "show"]).name("avatars.show");

  Route.middleware("auth").group(() => {
    Route.get("/preferences", [preferenceController, "show"]).name("preferences.show");
    Route.patch("/preferences", [preferenceController, "update"]).name("preferences.update");
    Route.post("/logout", [authenticationController, "delete"]).name("logout");
    Route.get("/devices", [deviceController, "index"]).name("devices.index");
    Route.post("/devices/logout-others", [deviceController, "destroyOthers"]).name("devices.logout-others");
    Route.delete("/devices/{id}", [deviceController, "destroy"]).whereNumber("id").name("devices.destroy");
    Route.get("/connected-apps", [connectedAppController, "index"]).name("connected-apps.index");
    Route.delete("/connected-apps/{id}", [connectedAppController, "destroy"]).whereNumber("id").name("connected-apps.destroy");
    Route.get("/activity", [activityController, "index"]).name("activity.index");
    Route.get("/profile", [authenticationController, "show"]).name("profile");
    Route.put("/avatar", [avatarController, "update"])
      .middleware(express.raw({ type: ["image/png", "image/jpeg", "image/webp"], limit: "1mb" }), "throttle:10,1")
      .name("avatar.update");
    Route.delete("/avatar", [avatarController, "destroy"]).name("avatar.destroy");
    Route.patch("/profile", [authenticationController, "update"]).request(UpdateProfileRequest).middleware("throttle:10,1").name("profile.update");
    Route.post("/verify-email", [verifyRegisteredUserController, "create"]).middleware("throttle:5,1").name("verify-email.send");
    Route.post("/resend-verification", [verifyRegisteredUserController, "create"]).middleware("throttle:5,1").name("verify-email.resend");
    Route.post("/verify-email/confirm", [verifyRegisteredUserController, "store"]).middleware("throttle:10,1").name("verify-email.confirm");
    Route.post("/change-password", [changePasswordController, "update"]).request(ChangePasswordRequest).middleware("throttle:auth").name("change-password");
    Route.get("/privacy/export", [privacyController, "export"]).middleware("throttle:5,1").name("privacy.export");
    Route.post("/delete-account", [privacyController, "destroy"]).request(DeleteAccountRequest).middleware("throttle:5,1").name("account.destroy");
  });

  Route.post("/register", [registerUserController, "create"]).request(RegisterUserRequest).middleware("throttle:auth").name("register");
});

Route.group({ prefix: "/oidc", as: "oidc." }, () => {
  Route.get("/.well-known/openid-configuration", [oidcController, "discovery"]).name("discovery");
  Route.get("/jwks", [oidcController, "jwks"]).name("jwks");
  Route.get("/authorize", [oidcController, "authorize"]).middleware("throttle:60,1").name("authorize");
  Route.post("/token", [oidcController, "token"]).middleware("throttle:60,1").name("token");
  Route.post("/introspect", [oidcController, "introspect"]).middleware("throttle:60,1").name("introspect");
  Route.match(["get", "post"], "/userinfo", [oidcController, "userinfo"]).name("userinfo");
  Route.post("/revoke", [oidcController, "revoke"]).middleware("throttle:60,1").name("revoke");
  Route.get("/logout", [oidcController, "logout"]).name("logout");

  Route.middleware("auth").group(() => {
    Route.get("/consent", [oidcController, "consentShow"]).name("consent.show");
    Route.post("/consent", [oidcController, "consentStore"]).name("consent.store");
  });
});

Route.group({ prefix: "/internal", as: "internal." }, () => {
  Route.get("/users/{id}", [internalUserController, "show"])
    .middleware("service:users:read")
    .whereNumber("id")
    .name("users.show");
});

export const apiV1Route = Route.router();