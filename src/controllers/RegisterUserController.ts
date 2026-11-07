import type { Request, Response } from "express"
import Auth from "../lib/auth/index.js"
import { User } from "../models/User.js"
import Validator from "../lib/core/validation/Validator.js";
import { Mail, WelcomeMail } from "../lib/core/mail/index.js";


class RegisterUserController {

    async create(req:Request, res:Response){
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

        if(await v.fails()){
            return res.status(422).json({ message: "validation error",  errors: v.errors().toObject() })
        }

        const data = v.validated()

        const user = await User.create(data)
        const auth = await Auth.login(user)

        const token = Auth.token()
        await Mail.to(user.email).send(new WelcomeMail(user));
        


        return res.json({ data: {auth, token, data, user}, message: "successfully registered" });
    }


}

export const registerUserController =  new RegisterUserController()