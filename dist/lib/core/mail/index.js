// mail/index.ts
// Single import point: import { Mail, WelcomeMail } from './mail/index.js';
export { Mail, PendingMail } from './Mail.js';
export { Mailable } from './Mailable.js';
export { MailManager } from './MailManager.js';
export { MailQueue } from './MailQueue.js';
export { default as mailConfig } from './config.js';
export * from './types.js';
export * from './views/layout.js';
export { WelcomeMail } from './mailables/WelcomeMail.js';
export { VerifyEmailMail } from './mailables/VerifyEmailMail.js';
export { ResetPasswordMail } from './mailables/ResetPasswordMail.js';
export { OtpMail } from './mailables/OtpMail.js';
// const mail = Mail
// export default Mail
export { WelcomeHeresMail } from './mailables/WelcomeHeresMail.js';
//# sourceMappingURL=index.js.map