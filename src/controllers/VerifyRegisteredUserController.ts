import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { Controller, type HttpRequest } from "../lib/core/controller/index.js"
import { Notify } from "../lib/core/notifications/Notify.js";
import { OtpNotification } from "../lib/core/notifications/index.js";
import { config } from "../lib/core/config/index.js";
import { DB } from "../lib/core/query/index.js";
import { User } from "../models/User.js"

class VerifyRegisteredUserController extends Controller {

    async create(req: HttpRequest) {
        const user = this.user<User>(req)

        if (user.isVerified) this.abort(409, 'Email is already verified.')

        const length = config("auth.otp.length", 6);
        const code = String(randomInt(0, 10 ** length)).padStart(length, "0");
        const now = new Date();
        const expiresAt = new Date(now.getTime() + config("auth.otp.ttlMinutes") * 60_000);

        await DB.table('email_verification_codes').updateOrInsert(
            { user_id: user.id },
            {
                code_hash: this.hashCode(user.id, code),
                expires_at: expiresAt,
                attempts: 0,
                created_at: now,
                updated_at: now,
            },
        );

        await Notify.send(user, new OtpNotification(code, config("auth.otp.ttlMinutes")));
        return this.ok(undefined, "Verification code sent.");
    }

    async confirm(req: HttpRequest) {
        const user = this.user<User>(req);
        if (user.isVerified) return this.ok({ user }, "Email is already verified.");

        const code = req.string('code');
        const length = config("auth.otp.length", 6);
        if (!new RegExp(`^\\d{${length}}$`).test(code)) {
            this.abort(422, 'Enter a valid verification code.', { code: ['Enter a valid verification code.'] });
        }

        const verification = await DB.table('email_verification_codes')
            .where('user_id', user.id)
            .first();

        if (!verification) {
            this.abort(422, 'No active verification code. Request a new one.', {
                code: ['No active verification code. Request a new one.'],
            });
        }

        if (new Date(verification.expires_at as string | Date).getTime() <= Date.now()) {
            await DB.table('email_verification_codes').where('user_id', user.id).delete();
            this.abort(422, 'Verification code has expired. Request a new one.', {
                code: ['Verification code has expired. Request a new one.'],
            });
        }

        const expectedHash = this.hashCode(user.id, code);
        const storedHash = String(verification.code_hash);
        const matches =
            Buffer.byteLength(storedHash) === Buffer.byteLength(expectedHash) &&
            timingSafeEqual(Buffer.from(storedHash), Buffer.from(expectedHash));

        if (!matches) {
            const attempts = Number(verification.attempts) + 1;
            if (attempts >= config("auth.otp.maxAttempts")) {
                await DB.table('email_verification_codes').where('user_id', user.id).delete();
            } else {
                await DB.table('email_verification_codes')
                    .where('user_id', user.id)
                    .update({ attempts, updated_at: new Date() });
            }

            this.abort(422, 'Invalid verification code.', { code: ['Invalid verification code.'] });
        }

        user.isVerified = true;
        await user.save();
        await DB.table('email_verification_codes').where('user_id', user.id).delete();

        return this.ok({ user }, "Email verified successfully.");
    }

    private hashCode(userId: number, code: string): string {
        return createHmac("sha256", config("auth.jwt.secret"))
            .update(`${userId}:${code}`)
            .digest("hex");
    }

}

export const verifyRegisteredUserController =  new VerifyRegisteredUserController()