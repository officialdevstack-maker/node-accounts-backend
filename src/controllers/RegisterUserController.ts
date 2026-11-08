import { Controller } from "../lib/core/controller/index.js"
import { Mail, WelcomeMail } from "../lib/core/mail/index.js";
import { User } from "../models/User.js"
import type { RegisterUserRequest } from "../requests/RegisterUserRequest.js"

class RegisterUserController extends Controller {

    async create(req: RegisterUserRequest) {
        const data = req.validated<{ fullname: string; email: string; phone: string; password: string }>()

        const user = await User.create({
            fullname: data.fullname,
            email: data.email,
            phone: data.phone,
            password: data.password,
        })
        await user.refresh()
        await Mail.to(user.email).send(new WelcomeMail(user));

        return this.ok({ auth: null, token: null, user }, "successfully registered");
    }

}

export const registerUserController =  new RegisterUserController()