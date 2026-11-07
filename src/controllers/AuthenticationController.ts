import type { Request, Response } from "express"
import bcrypt from "bcryptjs"
import Auth from "../lib/auth/index.js"
import Validator from "../lib/core/validation/Validator.js"
import { User } from "../models/User.js"

class AuthenticationController {
    show(req: Request, res: Response) {
        return res.json({ message: 'Successfully fetched user', status: 'success', data: req.user })
    }

    async create(req: Request, res: Response) {
        const v = Validator.make(req.body, {
            email: 'required|email',
            password: 'required|string'
        })

        if (await v.fails()) {
            return res.status(422).json({
                message: 'Validation failed',
                errors: v.errors().toObject()
            })
        }

        const data = v.validated()
        const email = String(data.email).trim().toLowerCase()
        const user = await User.scope('withPassword').findOne({ where: { email } })

        if (!user || !(await bcrypt.compare(String(data.password), user.password))) {
            return res.status(401).json({
                message: 'Invalid email or password.',
                errors: {
                    email: ['Invalid email or password.'],
                    password: ['Invalid email or password.']
                }
            })
        }

        const authUser = await Auth.login(user)
        const token = Auth.token()

        return res.json({
            data: { auth: authUser, token, user: authUser },
            message: 'successfully signed in'
        })
    }

    async delete(req: Request, res: Response) {
        await Auth.logout()
        return res.json({ message: 'Logged out successfully' })
    }
}

export const authenticationController = new AuthenticationController()