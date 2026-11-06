import type { Request, Response } from "express"
import Auth from "../lib/auth/index.js"
import { User } from "../models/User.js"


class AuthenticationController {

    show(req:Request, res:Response) {
        const authUser = Auth.user()
        return res.json({ data:authUser })
    }


    create(req:Request, res:Response){
        req.body

        return res.json({ message: "nothing yet" });
    }

    delete(req:Request, res:Response){
        Auth.logout()
        return 
        
    }

}

export const authenticationController =  new AuthenticationController()