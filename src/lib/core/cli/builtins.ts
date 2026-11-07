// cli/builtins.ts
import type { CommandClass } from './Kernel.js';
import { AboutCommand } from './commands/AboutCommand.js';
import { ConfigShowCommand } from './commands/ConfigShowCommand.js';
import { KeyGenerateCommand } from './commands/KeyGenerateCommand.js';
import { ListCommand } from './commands/ListCommand.js';
import { MailTestCommand } from './commands/MailTestCommand.js';
import { MailVerifyCommand } from './commands/MailVerifyCommand.js';
import { MakeCommandCommand } from './commands/MakeCommandCommand.js';
import { MakeMailCommand } from './commands/MakeMailCommand.js';
import { MakeNotificationCommand } from './commands/MakeNotificationCommand.js';
import { MakePackCommand } from './commands/MakePackCommand.js';
import { PackListCommand } from './commands/PackListCommand.js';

export const builtins: CommandClass[] = [
  ListCommand,
  AboutCommand,
  ConfigShowCommand,
  KeyGenerateCommand,
  MailTestCommand,
  MailVerifyCommand,
  MakeMailCommand,
  MakeNotificationCommand,
  MakeCommandCommand,
  MakePackCommand,
  PackListCommand,
];
