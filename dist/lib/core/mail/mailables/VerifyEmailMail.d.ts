import type { User } from '../../../../models/User.js';
import { Mailable } from '../Mailable.js';
export declare class VerifyEmailMail extends Mailable {
    private user;
    private verificationUrl;
    constructor(user: Pick<User, 'fullname'>, verificationUrl: string);
    build(): void;
}
//# sourceMappingURL=VerifyEmailMail.d.ts.map