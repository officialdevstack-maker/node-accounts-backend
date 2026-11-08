import { randomInt } from "node:crypto";
import { Controller } from "../lib/core/controller/index.js";
import { Notify } from "../lib/core/notifications/Notify.js";
import { OtpNotification } from "../lib/core/notifications/index.js";
import { config } from "../lib/core/config/index.js";
import { User } from "../models/User.js";
class VerifyRegisteredUserController extends Controller {
    async create(req) {
        const email = req.string('email');
        const user = await User.findByEmail(email);
        if (!user) {
            return this.abort(404, 'User not found.');
        }
        const length = config("auth.otp.length");
        const code = String(randomInt(0, 10 ** length)).padStart(length, "0");
        await Notify.send(user, new OtpNotification(code, config("auth.otp.ttlMinutes")));
        return this.ok(undefined, "Verification code sent.");
    }
}
export const verifyRegisteredUserController = new VerifyRegisteredUserController();
//# sourceMappingURL=VerifyRegisteredUserController.js.map