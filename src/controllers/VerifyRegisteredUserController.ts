import type { Request } from "express"
import { Controller } from "../lib/core/controller/index.js"
import { Notify } from "../lib/core/notifications/Notify.js";
import { OtpNotification } from "../lib/core/notifications/index.js";
import { User } from "../models/User.js"

class VerifyRegisteredUserController extends Controller {

    async create(req: Request) {
        const { email } = req.body as { email?: string }
        const user = await User.findByEmail(String(email ?? ''))

        if (!user) {
            return this.abort(404, 'User not found.')
        }

        Notify.send(user, new OtpNotification(""))
        return this.ok(undefined, 'Verification code sent.')
    }

}

export const verifyRegisteredUserController =  new VerifyRegisteredUserController()