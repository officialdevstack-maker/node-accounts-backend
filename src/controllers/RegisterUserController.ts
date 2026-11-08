import Auth from "../lib/auth/index.js"
import { sendVerificationCode } from "../lib/auth/verification.js"
import { Controller } from "../lib/core/controller/index.js"
import { User } from "../models/User.js"
import type { RegisterUserRequest } from "../requests/RegisterUserRequest.js"

class RegisterUserController extends Controller {
    async create(req: RegisterUserRequest) {
        const data = req.validated<{ fullname: string; email: string; phone: string; password: string }>()

        const created = await User.create({
            fullname: data.fullname,
            email: data.email,
            phone: data.phone,
            password: data.password,
        })
        await created.refresh()

        const user = await Auth.login(created)
        if (!user) throw new Error('Registered user could not be loaded after sign-in.')

        const token = Auth.token()
        if (!token) throw new Error('Authentication token was not issued after registration.')

        let codeSent = false
        try {
            codeSent = (await sendVerificationCode(user)).sent
        } catch (error) {
            console.error('[register] could not send verification code', error)
        }

        return this.created(
            { auth: user, token, user, verification: { sent: codeSent } },
            'successfully registered'
        )
    }
}

export const registerUserController = new RegisterUserController()
