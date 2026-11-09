import Auth from "../lib/auth/index.js"
import { verifyPassword } from "../lib/auth/password.js"
import { Controller, type HttpRequest } from "../lib/core/controller/index.js"
import Validator from "../lib/core/validation/Validator.js"
import { Activity } from "../models/Activity.js"
import { User } from "../models/User.js"
import type { UpdateProfileRequest } from "../requests/UpdateProfileRequest.js"

class AuthenticationController extends Controller {
    show(req: HttpRequest) {
        return this.ok(req.user, 'Successfully fetched user')
    }

    async update(req: UpdateProfileRequest) {
        const user = this.user<User>(req)
        const data = req.validated<{ fullname: string; phone: string }>()

        const changed: string[] = []
        if (data.fullname !== user.fullname) changed.push('fullname')
        if (data.phone !== (user.phone ?? '')) changed.push('phone')

        if (changed.length) {
            await user.update({ fullname: data.fullname, phone: data.phone })
            await Activity.record(
                user.id,
                'profile_updated',
                { ip: req.ip(), userAgent: req.userAgent() },
                { fields: changed },
            )
        }

        return this.ok(user, 'Profile updated.')
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

        const passwordValid = await verifyPassword(
            String(data.password),
            user ? String(user.getHidden('password')) : undefined,
        )
        if (!user || !passwordValid) {
            if (user) {
                await Activity.record(user.id, 'login_failed', { ip: req.ip(), userAgent: req.userAgent() })
            }
            this.abort(401, 'Invalid email or password.', {
                email: ['Invalid email or password.'],
                password: ['Invalid email or password.']
            })
        }

        if (user.suspendedAt) this.abort(403, 'This account has been suspended.')

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