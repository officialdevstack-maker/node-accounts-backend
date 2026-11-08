// cli/Output.ts
// Terminal output + prompts. Zero dependencies. Colours switch off automatically
// when piped, or when NO_COLOR is set (FORCE_COLOR=1 forces them on).
import { createInterface } from 'node:readline/promises';
const STYLES = {
    bold: [1, 22],
    dim: [2, 22],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    cyan: [36, 39],
    gray: [90, 39],
};
export class Output {
    out;
    err;
    interactive;
    constructor(out = process.stdout, err = process.stderr, 
    /** When false, ask()/confirm()/choice() return their defaults instead of prompting. */
    interactive = Boolean(process.stdin.isTTY)) {
        this.out = out;
        this.err = err;
        this.interactive = interactive;
    }
    // ---- styling ---------------------------------------------------------------------------
    colorEnabled(stream) {
        if ('NO_COLOR' in process.env)
            return false;
        if (process.env.FORCE_COLOR)
            return true;
        return Boolean(stream.isTTY);
    }
    style(name, text, stream = this.out) {
        if (!this.colorEnabled(stream))
            return text;
        const [open, close] = STYLES[name];
        return `\x1b[${open}m${text}\x1b[${close}m`;
    }
    // ---- writing ---------------------------------------------------------------------------
    line(text = '') {
        this.out.write(`${text}\n`);
    }
    newLine(count = 1) {
        this.out.write('\n'.repeat(count));
    }
    info(text) {
        this.line(this.style('green', text));
    }
    success(text) {
        this.line(`${this.style('green', ' DONE ')} ${text}`);
    }
    warn(text) {
        this.line(this.style('yellow', text));
    }
    comment(text) {
        this.line(this.style('gray', text));
    }
    error(text) {
        this.err.write(`${this.style('red', text, this.err)}\n`);
    }
    title(text) {
        this.newLine();
        this.line(this.style('bold', text));
    }
    /** table(['Name', 'Value'], [['a', '1'], ['b', '2']]) */
    table(headers, rows) {
        const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
        const fmt = (cells) => cells.map((c, i) => c.padEnd(widths[i] ?? 0)).join('  ');
        this.line(this.style('bold', fmt(headers)));
        this.line(this.style('gray', widths.map((w) => '-'.repeat(w)).join('  ')));
        for (const row of rows)
            this.line(fmt(row));
    }
    /** label ........ value  (used by `about`) */
    definitionList(rows) {
        const width = Math.max(...rows.map(([label]) => label.length)) + 3;
        for (const [label, value] of rows) {
            const dots = this.style('gray', '.'.repeat(width - label.length));
            this.line(`  ${this.style('bold', label)} ${dots} ${value}`);
        }
    }
    // ---- prompts ---------------------------------------------------------------------------
    async ask(question, fallback = '') {
        if (!this.interactive)
            return fallback;
        const rl = createInterface({ input: process.stdin, output: this.out });
        try {
            const hint = fallback ? this.style('gray', ` [${fallback}]`) : '';
            const answer = (await rl.question(`${question}${hint} `)).trim();
            return answer || fallback;
        }
        finally {
            rl.close();
        }
    }
    async confirm(question, fallback = false) {
        if (!this.interactive)
            return fallback;
        const answer = await this.ask(`${question} (yes/no)`, fallback ? 'yes' : 'no');
        return /^y(es)?$/i.test(answer);
    }
    async choice(question, choices, fallback) {
        const initial = fallback ?? choices[0];
        if (!this.interactive)
            return initial;
        for (;;) {
            const answer = await this.ask(`${question} (${choices.join('/')})`, initial);
            if (choices.includes(answer))
                return answer;
            this.error(`"${answer}" is not one of: ${choices.join(', ')}`);
        }
    }
}
//# sourceMappingURL=Output.js.map