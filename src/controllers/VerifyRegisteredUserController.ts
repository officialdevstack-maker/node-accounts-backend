// src/controllers/VerifyRegisteredUserController.ts
import { Controller, type HttpRequest } from "../lib/core/controller/index.js"
import { config } from "../lib/core/config/index.js"
import { Mail, WelcomeMail } from "../lib/core/mail/index.js"
import { sendVerificationCode } from "../lib/auth/verification.js"
import { EmailVerification } from "../models/EmailVerification.js"
import { Activity } from "../models/Activity.js"
import type { User } from "../models/User.js"

class VerifyRegisteredUserController extends Controller {
    async create(req: HttpRequest) {
        const user = this.user<User>(req)
        this.abortIf(user.isVerified, 422, 'Your email is already verified.')

        const { sent, retryAfter } = await sendVerificationCode(user)
        return this.ok(
            { sent, retryAfter },
            sent ? 'Verification code sent.' : 'A code was sent recently. Check your inbox.'
        )
    }

    async store(req: HttpRequest) {
        const user = this.user<User>(req)
        const { code } = await this.validate<{ code: string }>(req, {
            code: `required|digits:${config('auth.otp.length')}`,
        })

        if (user.isVerified) return this.ok({ user }, 'Email already verified.')

        // Look up by user_id (with the hidden code hash loaded), not by the row's primary key.
        const record = await EmailVerification.forUser(user.id)
        if (!record || record.isExpired()) return this.invalidCode()

        const maxAttempts = config('auth.otp.maxAttempts')
        if (record.attempts >= maxAttempts) {
            await record.delete()
            return this.abort(429, 'Too many attempts. Request a new code.')
        }

        if (!record.matches(code)) {
            await record.recordFailure()
            if (record.attempts >= maxAttempts) {
                await record.delete()
                return this.abort(429, 'Too many attempts. Request a new code.')
            }
            return this.invalidCode()
        }

        await record.delete()
        user.isVerified = true
        await user.save()
        await Activity.record(user.id, 'email_verified', {
            ip: req.ip(),
            userAgent: req.userAgent(),
        })

        Mail.to(user.email).queue(new WelcomeMail(user))

        return this.ok({ user }, 'Email verified.')
    }

    private invalidCode(): never {
        return this.abort(422, 'Invalid or expired code.', { code: ['Invalid or expired code.'] })
    }
}

export const verifyRegisteredUserController = new VerifyRegisteredUserController()