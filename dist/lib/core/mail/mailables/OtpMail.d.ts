import { Mailable } from '../Mailable.js';
export declare class OtpMail extends Mailable {
    private code;
    private expiresInMinutes;
    constructor(code: string, expiresInMinutes?: number);
    build(): void;
}
//# sourceMappingURL=OtpMail.d.ts.map