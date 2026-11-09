import { CliError } from '../cli/index.js';
import { DatabaseCommand } from '../database/commands/DatabaseCommand.js';
import { User } from '../../../models/User.js';

export default class AdminGrantCommand extends DatabaseCommand {
  readonly signature = 'admin:grant {email : Account email} {--revoke : Remove admin access instead}';
  readonly description = 'Give or remove admin access for a user';

  async handle(): Promise<number> {
    const email = this.argument('email')!.trim().toLowerCase();
    const user = await User.findByEmail(email);
    if (!user) throw new CliError(`No user with email ${email}.`);

    const revoke = this.flag('revoke');
    user.forceFill({ isAdmin: !revoke });
    await user.save();

    this.success(`${email} is ${revoke ? 'no longer' : 'now'} an admin.`);
    return 0;
  }
}
