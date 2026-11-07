// cli/Input.ts
// Laravel-style signatures:  'make:mail {name : Class name} {--force : Overwrite} {--F|queue=default}'
//
//   {name}          required argument          {--force}        boolean flag
//   {name?}         optional argument          {--queue=}       option that needs a value
//   {name=World}    argument with default      {--queue=high}   option with default value
//   {name : text}   description after " : "    {--Q|queue=}     with a one-letter shortcut (-Q)

export class CliError extends Error {
  constructor(
    message: string,
    /** Print the command's usage line under the error. */
    readonly showUsage = false,
  ) {
    super(message);
    this.name = 'CliError';
  }
}

export interface ArgumentDef {
  name: string;
  description: string;
  required: boolean;
  default?: string;
}

export interface OptionDef {
  name: string;
  shortcut?: string;
  description: string;
  takesValue: boolean;
  default?: string;
}

export interface SignatureDef {
  name: string;
  arguments: ArgumentDef[];
  options: OptionDef[];
}

export interface ParsedInput {
  arguments: Record<string, string | undefined>;
  options: Record<string, string | boolean | undefined>;
}

export function parseSignature(signature: string): SignatureDef {
  const nameMatch = signature.trim().match(/^([^\s{]+)/);
  if (!nameMatch) throw new Error(`Invalid command signature: "${signature}"`);

  const def: SignatureDef = { name: nameMatch[1]!, arguments: [], options: [] };

  for (const match of signature.matchAll(/\{([^}]+)\}/g)) {
    const [definition = '', ...rest] = match[1]!.trim().split(/\s+:\s+/);
    const description = rest.join(' : ');
    const token = definition.trim();

    if (token.startsWith('--')) {
      let body = token.slice(2);
      let shortcut: string | undefined;
      if (body.includes('|')) [shortcut, body] = body.split('|') as [string, string];

      const eq = body.indexOf('=');
      if (eq === -1) {
        def.options.push({ name: body, shortcut, description, takesValue: false });
      } else {
        def.options.push({
          name: body.slice(0, eq),
          shortcut,
          description,
          takesValue: true,
          default: body.slice(eq + 1) || undefined,
        });
      }
      continue;
    }

    let name = token;
    let required = true;
    let fallback: string | undefined;

    if (name.endsWith('?')) {
      name = name.slice(0, -1);
      required = false;
    } else if (name.includes('=')) {
      const eq = name.indexOf('=');
      fallback = name.slice(eq + 1) || undefined;
      name = name.slice(0, eq);
      required = false;
    }

    if (required && def.arguments.some((a) => !a.required)) {
      throw new Error(`Invalid signature "${def.name}": required argument {${name}} cannot follow an optional one.`);
    }
    def.arguments.push({ name, description, required, default: fallback });
  }

  return def;
}

export function parseArgv(def: SignatureDef, argv: string[]): ParsedInput {
  const options: ParsedInput['options'] = {};
  for (const o of def.options) options[o.name] = o.takesValue ? o.default : false;

  const positionals: string[] = [];
  let literal = false; // after "--" everything is positional

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;

    if (literal || !token.startsWith('-') || token === '-') {
      positionals.push(token);
      continue;
    }
    if (token === '--') {
      literal = true;
      continue;
    }

    const isLong = token.startsWith('--');
    const [rawName = '', ...valueParts] = token.slice(isLong ? 2 : 1).split('=');
    let value: string | undefined = valueParts.length ? valueParts.join('=') : undefined;

    const option = def.options.find((o) => (isLong ? o.name === rawName : o.shortcut === rawName));
    if (!option) throw new CliError(`Unknown option: ${isLong ? '--' : '-'}${rawName}`, true);

    if (!option.takesValue) {
      if (value !== undefined) throw new CliError(`Option --${option.name} does not accept a value.`, true);
      options[option.name] = true;
      continue;
    }

    if (value === undefined) {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('-')) {
        throw new CliError(`Option --${option.name} requires a value (use --${option.name}=value).`, true);
      }
      value = next;
      i++;
    }
    options[option.name] = value;
  }

  const args: ParsedInput['arguments'] = {};
  def.arguments.forEach((a, index) => {
    const given = positionals[index];
    if (given === undefined && a.required) throw new CliError(`Missing required argument: ${a.name}`, true);
    args[a.name] = given ?? a.default;
  });

  if (positionals.length > def.arguments.length) {
    throw new CliError(`Too many arguments: ${positionals.slice(def.arguments.length).join(' ')}`, true);
  }

  return { arguments: args, options };
}
