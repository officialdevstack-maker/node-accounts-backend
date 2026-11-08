import type { User } from '../../../../models/User.js';
import { Mailable } from '../Mailable.js';
export declare class WelcomeMail extends Mailable {
    private user;
    constructor(user: Pick<User, 'fullname'>);
    build(): void;
}
//# sourceMappingURL=WelcomeMail.d.ts.map