import type { User } from '../../../../models/User.js';
import { Mailable } from '../Mailable.js';
export declare class ResetPasswordMail extends Mailable {
    private user;
    private resetUrl;
    private expiresInMinutes;
    constructor(user: Pick<User, 'fullname'>, resetUrl: string, expiresInMinutes?: number);
    build(): void;
}
//# sourceMappingURL=ResetPasswordMail.d.ts.map