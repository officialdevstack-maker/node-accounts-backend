import { Controller, type HttpRequest } from "../lib/core/controller/index.js"
import { Notify } from "../lib/core/notifications/Notify.js";
import { OtpNotification } from "../lib/core/notifications/index.js";
import { User } from "../models/User.js"

class VerifyRegisteredUserController extends Controller {

    async create(req: HttpRequest) {
        const email = req.string('email')
        const user = await User.findByEmail(email)

        if (!user) {
            return this.abort(404, 'User not found.')
        }

        Notify.send(user, new OtpNotification(""))
        return this.ok(undefined, 'Verification code sent.')
    }

}

export const verifyRegisteredUserController =  new VerifyRegisteredUserController()