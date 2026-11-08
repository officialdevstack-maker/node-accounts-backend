import { Controller, type HttpRequest } from "../lib/core/controller/index.js"
import { config } from "../lib/core/config/index.js"
import { Mail, WelcomeMail } from "../lib/core/mail/index.js"
import { sendVerificationCode } from "../lib/auth/verification.js"
import { EmailVerification } from "../models/EmailVerification.js"
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

        const record = await EmailVerification.find(user.id)
        if (!record || record.expiresAt.getTime() <= Date.now()) return this.invalidCode()

        const maxAttempts = config('auth.otp.maxAttempts')
        if (record.attempts >= maxAttempts) {
            await EmailVerification.destroy(user.id)
            return this.abort(429, 'Too many attempts. Request a new code.')
        }

        if (!EmailVerification.matches(record, code)) {
            await EmailVerification.recordFailure(user.id)
            const failedRecord = await EmailVerification.find(user.id)
            if (failedRecord && failedRecord.attempts >= maxAttempts) {
                await EmailVerification.destroy(user.id)
                return this.abort(429, 'Too many attempts. Request a new code.')
            }
            return this.invalidCode()
        }

        await EmailVerification.destroy(user.id)
        user.isVerified = true
        await user.save()

        Mail.to(user.email).queue(new WelcomeMail(user))

        return this.ok({ user }, 'Email verified.')
    }

    private invalidCode(): never {
        return this.abort(422, 'Invalid or expired code.', { code: ['Invalid or expired code.'] })
    }
}

export const verifyRegisteredUserController = new VerifyRegisteredUserController()
