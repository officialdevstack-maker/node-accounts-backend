import type { Request } from "express"
import Auth from "../lib/auth/index.js"
import { Controller } from "../lib/core/controller/index.js"
import { Mail, WelcomeMail } from "../lib/core/mail/index.js";
import Validator from "../lib/core/validation/Validator.js";
import { User } from "../models/User.js"

class RegisterUserController extends Controller {

    async create(req: Request) {
        const v = Validator.make(req.body, {
            // validators/auth.ts
            fullname: [ "required",  "string",
            `regex:${String.raw`/^\p{L}[\p{L}'.-]*(?:\s+\p{L}[\p{L}'.-]*)+$/u`}`,
            ],
            email: ['required', "unique:users", "email"],
            phone: ["required","string"],
            password: "required|string|min:8|confirmed"

        }, {
            "fullname.regex": "Must enter first and last names"
        });

        if (await v.fails()) {
            return this.abort(422, "validation error", v.errors().toObject())
        }

        const data = v.validated()

        const user = await User.create({
            fullname: data.fullname,
            email: data.email,
            phone: data.phone,
            password: data.password,
        })
        const auth = await Auth.login(user)

        const token = Auth.token()
        await Mail.to(user.email).send(new WelcomeMail(user));

        return this.ok({ auth, token, user }, "successfully registered");
    }

}

export const registerUserController =  new RegisterUserController()