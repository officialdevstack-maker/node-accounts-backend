// notifications/messages/WalletCreditedNotification.ts
import { WalletCreditedMail } from '../../mail/mailables/WalletCreditedMail.js';
import { Notification } from '../Notification.js';
export class WalletCreditedNotification extends Notification {
    amount;
    reference;
    balance;
    shouldQueue = true; // delivered in the background with retries
    constructor(amount, reference, balance) {
        super();
        this.amount = amount;
        this.reference = reference;
        this.balance = balance;
    }
    via() {
        return ['database', 'mail'];
    }
    toMail() {
        return new WalletCreditedMail(this.amount, this.reference, this.balance);
    }
    toDatabase() {
        return {
            title: 'Wallet credited',
            amount: this.amount,
            balance: this.balance,
            reference: this.reference,
        };
    }
}
//# sourceMappingURL=WalletCreditedNotification.js.map