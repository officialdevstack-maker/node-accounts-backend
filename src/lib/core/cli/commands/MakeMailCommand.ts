// cli/commands/MakeMailCommand.ts
import { Command } from '../Command.js';
import { mailableStub } from '../stubs.js';
import { addExport, appPath, className, displayPath, humanize, writeFileSafe } from '../support.js';

export class MakeMailCommand extends Command {
  readonly signature = 'make:mail {name : Name of the mailable, e.g. InvoiceMail or invoice} {--force : Overwrite if it exists}';
  readonly description = 'Create a new Mailable class in mail/mailables';

  async handle(): Promise<number> {
    const { full, stem } = className(this.argument('name')!, 'Mail');
    const file = appPath('mail', 'mailables', `${full}.ts`);

    const result = await writeFileSafe(file, mailableStub(full, humanize(stem)), this.flag('force'));
    if (result === 'exists') {
      this.error(`${displayPath(file)} already exists. Use --force to overwrite.`);
      return 1;
    }

    this.success(`${full} ${result}: ${displayPath(file)}`);

    if (await addExport(appPath('mail', 'index.ts'), `export { ${full} } from './mailables/${full}.js';`)) {
      this.comment('Exported from mail/index.ts');
    }
    return 0;
  }
}
