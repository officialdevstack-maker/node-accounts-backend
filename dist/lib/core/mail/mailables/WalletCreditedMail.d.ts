import { Mailable } from '../Mailable.js';
export declare class WalletCreditedMail extends Mailable {
    private amount;
    private reference;
    private balance;
    constructor(amount: number, reference: string, balance: number);
    build(): void;
}
//# sourceMappingURL=WalletCreditedMail.d.ts.map