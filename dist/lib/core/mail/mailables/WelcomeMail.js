import { Mailable } from '../Mailable.js';
import mailConfig from '../config.js';
import { layout, paragraph, button, e } from '../views/layout.js';
export class WelcomeMail extends Mailable {
    user;
    constructor(user) {
        super();
        this.user = user;
    }
    build() {
        const { name, url } = mailConfig.app;
        this.subject(`Welcome to ${name}`).html(layout({
            title: `Welcome, ${this.user.fullname}!`,
            preheader: `Your ${name} account is ready.`,
            body: paragraph(`Thanks for joining <strong>${e(name)}</strong>. Your account is ready to go.`) +
                button(url, 'Open your account') +
                paragraph('If you have any questions, just reply to this email.'),
        }));
    }
}
//# sourceMappingURL=WelcomeMail.js.map