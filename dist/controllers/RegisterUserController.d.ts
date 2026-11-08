import { Controller } from "../lib/core/controller/index.js";
import type { RegisterUserRequest } from "../requests/RegisterUserRequest.js";
declare class RegisterUserController extends Controller {
    create(req: RegisterUserRequest): Promise<import("../lib/core/response/Reply.js").Reply>;
}
export declare const registerUserController: RegisterUserController;
export {};
//# sourceMappingURL=RegisterUserController.d.ts.map