import type { Request, Response } from "express"
import { User } from "../models/User.js"
import { Mail, OtpMail, WelcomeMail } from "../lib/core/mail/index.js"
import { Notify } from "../lib/core/notifications/Notify.js";
import { OtpNotification } from "../lib/core/notifications/index.js";

class VerifyRegisteredUserController {

    async create(req:Request, res:Response) {
        const { email } = req.body as { email?: string }
        const user = await User.findOne({ where: { email } })

        if (!user) {
            return res.status(404).json({ message: 'User not found.' })
        }

        Notify.send(user, new OtpNotification(""))
        return res.json({ message: 'Verification code sent.' })
    }

}

export const verifyRegisteredUserController =  new VerifyRegisteredUserController()