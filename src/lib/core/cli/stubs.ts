// cli/stubs.ts
// File templates used by the make:* commands. They match the style of the existing packs.

export function mailableStub(cls: string, title: string): string {
  return `// mail/mailables/${cls}.ts
import { Mailable } from '../Mailable.js';
import { layout, paragraph } from '../views/layout.js';

export class ${cls} extends Mailable {
  // constructor(private name: string) { super(); }

  build(): void {
    this.subject('${title}').html(
      layout({
        title: '${title}',
        preheader: '',
        body: paragraph('Write your message here.'),
      }),
    );
  }
}
`;
}

export interface NotificationStubOptions {
  cls: string;
  title: string;
  channels: string[];
  mailable?: string;
}

export function notificationStub({ cls, title, channels, mailable }: NotificationStubOptions): string {
  const has = (c: string) => channels.includes(c);
  const imports = [
    mailable && has('mail') ? `import { ${mailable} } from '../../mail/mailables/${mailable}.js';` : '',
    `import { Notification } from '../Notification.js';`,
    `import type { ChannelName } from '../types.js';`,
  ].filter(Boolean);

  const methods = [
    has('mail') && mailable ? `  toMail() {\n    return new ${mailable}();\n  }` : '',
    has('database') ? `  toDatabase() {\n    return {\n      title: '${title}',\n    };\n  }` : '',
    has('sms') ? `  toSms() {\n    return '${title}.';\n  }` : '',
  ].filter(Boolean);

  return `// notifications/messages/${cls}.ts
${imports.join('\n')}

export class ${cls} extends Notification {
  // shouldQueue = true; // uncomment to deliver in the background with retries

  // constructor(private amount: number) { super(); }

  via(): ChannelName[] {
    return [${channels.map((c) => `'${c}'`).join(', ')}];
  }

${methods.join('\n\n')}
}
`;
}

export function commandStub(cls: string, signatureName: string): string {
  return `// commands/${cls}.ts
import { Command } from '../cli/index.js';

export default class ${cls} extends Command {
  readonly signature = '${signatureName} {name? : An example argument} {--dry-run : An example flag}';
  readonly description = 'Describe what this command does';

  async handle(): Promise<number | void> {
    const name = this.argument('name') ?? 'world';

    if (this.flag('dry-run')) this.warn('Dry run, nothing will be changed.');

    this.info(\`Hello, \${name}!\`);
  }
}
`;
}

export interface PackStubOptions {
  /** kebab-case folder name, e.g. billing */
  name: string;
  /** PascalCase, e.g. Billing */
  pascal: string;
  description: string;
}

export function packStub({ name, pascal, description }: PackStubOptions): string {
  return `// ${name}/pack.ts
// Found automatically by artisan (every <folder>/pack.ts next to cli/ is loaded). No registration needed.
import { definePack } from '../cli/index.js';
import { ${pascal}InfoCommand } from './commands/${pascal}InfoCommand.js';

export default definePack({
  name: '${name}',
  description: '${description.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',
  commands: [${pascal}InfoCommand],
});
`;
}

export function packCommandStub({ name, pascal }: PackStubOptions): string {
  return `// ${name}/commands/${pascal}InfoCommand.ts
import { Command } from '../../cli/index.js';

export class ${pascal}InfoCommand extends Command {
  readonly signature = '${name}:info';
  readonly description = 'Show information about the ${name} pack';

  handle(): void {
    this.info('The ${name} pack is registered.');
  }
}
`;
}

export function packIndexStub({ name }: PackStubOptions): string {
  return `// ${name}/index.ts
// Single import point for the pack's public API: import { ... } from './${name}/index.js';
export {};
`;
}

export function packReadmeStub({ name, description }: PackStubOptions): string {
  return `# ${name} pack

${description}

## Commands
\`\`\`bash
npm run artisan -- ${name}:info
npm run artisan -- make:command ${name}-thing --command=${name}:thing   # then move it into ${name}/commands/ and list it in pack.ts
\`\`\`

New commands go in \`commands/\` and get listed in \`pack.ts\`. \`artisan pack:list\` shows what is registered.
`;
}
