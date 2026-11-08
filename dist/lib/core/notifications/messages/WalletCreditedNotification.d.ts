import { WalletCreditedMail } from '../../mail/mailables/WalletCreditedMail.js';
import { Notification } from '../Notification.js';
import type { ChannelName } from '../types.js';
export declare class WalletCreditedNotification extends Notification {
    private amount;
    private reference;
    private balance;
    shouldQueue: boolean;
    constructor(amount: number, reference: string, balance: number);
    via(): ChannelName[];
    toMail(): WalletCreditedMail;
    toDatabase(): {
        title: string;
        amount: number;
        balance: number;
        reference: string;
    };
}
//# sourceMappingURL=WalletCreditedNotification.d.ts.map