import { Controller, type HttpRequest } from "../lib/core/controller/index.js";
declare class AuthenticationController extends Controller {
    show(req: HttpRequest): import("../lib/core/response/Reply.js").Reply;
    create(req: HttpRequest): Promise<import("../lib/core/response/Reply.js").Reply>;
    delete(): Promise<import("../lib/core/response/Reply.js").Reply>;
}
export declare const authenticationController: AuthenticationController;
export {};
//# sourceMappingURL=AuthenticationController.d.ts.map