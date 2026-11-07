// mail/mailables/WalletCreditedMail.ts
import { Mailable } from '../Mailable.js';
import { layout, paragraph, e } from '../views/layout.js';

const naira = (value: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value);

export class WalletCreditedMail extends Mailable {
  constructor(
    private amount: number,
    private reference: string,
    private balance: number,
  ) {
    super();
  }

  build(): void {
    this.subject(`Wallet credited: ${naira(this.amount)}`).html(
      layout({
        title: 'Wallet credited',
        preheader: `${naira(this.amount)} has been added to your wallet.`,
        body:
          paragraph(`Your wallet was credited with <strong>${e(naira(this.amount))}</strong>.`) +
          paragraph(`New balance: <strong>${e(naira(this.balance))}</strong>`) +
          paragraph(`Reference: ${e(this.reference)}`),
      }),
    );
  }
}
