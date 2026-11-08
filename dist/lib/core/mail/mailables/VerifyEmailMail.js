import { Mailable } from '../Mailable.js';
import { layout, paragraph, button, e } from '../views/layout.js';
export class VerifyEmailMail extends Mailable {
    user;
    verificationUrl;
    constructor(user, verificationUrl) {
        super();
        this.user = user;
        this.verificationUrl = verificationUrl;
    }
    build() {
        this.subject('Verify your email address').html(layout({
            title: 'Verify your email address',
            preheader: 'Confirm your email to finish setting up your account.',
            body: paragraph(`Hi ${e(this.user.fullname)}, please confirm your email address by clicking the button below.`) +
                button(this.verificationUrl, 'Verify email') +
                paragraph('If you did not create an account, no further action is required.'),
        }));
    }
}
//# sourceMappingURL=VerifyEmailMail.js.map