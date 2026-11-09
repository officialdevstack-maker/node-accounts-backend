import bcrypt from "bcryptjs"
import Auth from "../lib/auth/index.js"
import { Controller, type HttpRequest } from "../lib/core/controller/index.js"
import Validator from "../lib/core/validation/Validator.js"
import { Activity } from "../models/Activity.js"
import { User } from "../models/User.js"

class AuthenticationController extends Controller {
    show(req: HttpRequest) {
        return this.ok(req.user, 'Successfully fetched user')
    }

    async create(req: HttpRequest) {
        const v = Validator.make(req.body, {
            email: 'required|email',
            password: 'required|string'
        })

        if (await v.fails()) {
            return this.abort(422, 'Validation failed', v.errors().toObject())
        }

        const data = v.validated()
        const email = String(data.email).trim().toLowerCase()
        const user = await User.findByEmailWithPassword(email)

        if (!user || !(await bcrypt.compare(String(data.password), String(user.getHidden('password'))))) {
            if (user) {
                await Activity.record(user.id, 'login_failed', { ip: req.ip(), userAgent: req.userAgent() })
            }
            this.abort(401, 'Invalid email or password.', {
                email: ['Invalid email or password.'],
                password: ['Invalid email or password.']
            })
        }

        const authUser = await Auth.login(user, false)
        const token = Auth.token()

        return this.ok({ auth: authUser, token, user: authUser }, 'successfully signed in')
    }

    async delete() {
        await Auth.logout()
        return this.ok(undefined, 'Logged out successfully')
    }
}

export const authenticationController = new AuthenticationController()