// notifications/messages/WalletCreditedNotification.ts
import { WalletCreditedMail } from '../../mail/mailables/WalletCreditedMail.js';
import { Notification } from '../Notification.js';
import type { ChannelName } from '../types.js';

export class WalletCreditedNotification extends Notification {
  shouldQueue = true; // delivered in the background with retries

  constructor(
    private amount: number,
    private reference: string,
    private balance: number,
  ) {
    super();
  }

  via(): ChannelName[] {
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
