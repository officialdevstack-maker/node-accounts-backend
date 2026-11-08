// cli/Command.ts
// Base class for every artisan command, like Illuminate\Console\Command.
import { parseArgv, parseSignature } from './Input.js';
import { Output } from './Output.js';
export class Command {
    /** Hide from `list` (still runnable). */
    hidden = false;
    io;
    input;
    parsed;
    // ---- definition ------------------------------------------------------------------------
    get definition() {
        return (this.parsed ??= parseSignature(this.signature));
    }
    get name() {
        return this.definition.name;
    }
    usage() {
        const args = this.definition.arguments.map((a) => (a.required ? `<${a.name}>` : `[<${a.name}>]`));
        const opts = this.definition.options.length ? ['[options]'] : [];
        return [this.name, ...args, ...opts].join(' ');
    }
    renderHelp(io) {
        const { arguments: args, options } = this.definition;
        io.title('Description:');
        io.line(`  ${this.description}`);
        io.title('Usage:');
        io.line(`  ${this.usage()}`);
        if (args.length) {
            io.title('Arguments:');
            const width = Math.max(...args.map((a) => a.name.length));
            for (const a of args) {
                const extra = a.default ? io.style('gray', ` [default: ${a.default}]`) : a.required ? '' : io.style('gray', ' (optional)');
                io.line(`  ${io.style('green', a.name.padEnd(width))}  ${a.description}${extra}`);
            }
        }
        if (options.length) {
            io.title('Options:');
            const label = (o) => `${o.shortcut ? `-${o.shortcut}, ` : '    '}--${o.name}${o.takesValue ? '=VALUE' : ''}`;
            const width = Math.max(...options.map((o) => label(o).length));
            for (const o of options) {
                const extra = o.default ? io.style('gray', ` [default: ${o.default}]`) : '';
                io.line(`  ${io.style('green', label(o).padEnd(width))}  ${o.description}${extra}`);
            }
        }
        io.newLine();
    }
    // ---- running ---------------------------------------------------------------------------
    async run(argv, io) {
        this.io = io;
        this.input = parseArgv(this.definition, argv);
        const code = await this.handle();
        return typeof code === 'number' ? code : 0;
    }
    // ---- input helpers ---------------------------------------------------------------------
    argument(name) {
        return this.input.arguments[name];
    }
    /** Value of a `--option=value`. */
    option(name) {
        const value = this.input.options[name];
        return typeof value === 'string' ? value : undefined;
    }
    /** True when a `--flag` was passed. */
    flag(name) {
        return this.input.options[name] === true;
    }
    // ---- output helpers (delegates to this.io) ---------------------------------------------
    line(text = '') { this.io.line(text); }
    newLine(count = 1) { this.io.newLine(count); }
    info(text) { this.io.info(text); }
    success(text) { this.io.success(text); }
    warn(text) { this.io.warn(text); }
    comment(text) { this.io.comment(text); }
    error(text) { this.io.error(text); }
    title(text) { this.io.title(text); }
    table(headers, rows) { this.io.table(headers, rows); }
    ask(question, fallback = '') { return this.io.ask(question, fallback); }
    confirm(question, fallback = false) { return this.io.confirm(question, fallback); }
    choice(question, choices, fallback) {
        return this.io.choice(question, choices, fallback);
    }
}
//# sourceMappingURL=Command.js.map