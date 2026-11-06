import type { Request, Response } from "express"
import Auth from "../lib/auth/index.js"
import { User } from "../models/User.js"
import Validator from "../lib/validation/Validator.js";


class RegisterUserController {

    async create(req:Request, res:Response){
        const rawData = req.body
        console.log({rawData})
        const v = Validator.make(req.body, {
            // validators/auth.ts
            fullname: [
            "required",
            "string",
            `regex:${String.raw`/^\p{L}[\p{L}'.-]*(?:\s+\p{L}[\p{L}'.-]*)+$/u`}`,
            ],
            email: ['required', "unique", "email"]

        });

        if(await v.fails()){
            return res.status(422).json({ errors: v.errors().toObject() })
        }

        const data = v.validated()

        return res.json({ message: "nothing yet in register user cotnroller" });
    }


}

export const registerUserController =  new RegisterUserController()