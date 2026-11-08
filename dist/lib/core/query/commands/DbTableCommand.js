import { CliError } from '../../cli/index.js';
import { DatabaseCommand } from '../../database/commands/DatabaseCommand.js';
import { DB } from '../DB.js';
const SECRET = /(password|pass|secret|token|hash|api_?key)/i;
function cell(key, value) {
    if (value === null || value === undefined)
        return 'NULL';
    if (SECRET.test(key))
        return '********';
    const text = value instanceof Date ? value.toISOString() : typeof value === 'object' ? JSON.stringify(value) : String(value);
    return text.length > 40 ? `${text.slice(0, 37)}...` : text;
}
export class DbTableCommand extends DatabaseCommand {
    signature = 'db:table {table : Table name} {--limit=10 : Rows to show}';
    description = 'Show the row count and the first rows of a table (secrets are masked)';
    async handle() {
        const table = this.argument('table');
        const limit = Number(this.option('limit'));
        if (!Number.isInteger(limit) || limit < 1 || limit > 1000)
            throw new CliError('--limit must be a whole number between 1 and 1000.');
        const total = await DB.table(table).count();
        const rows = await DB.table(table).limit(limit).get();
        this.title(`${table} (${total} row${total === 1 ? '' : 's'})`);
        if (!rows.length) {
            this.comment('No rows.');
            return 0;
        }
        const headers = Object.keys(rows[0]);
        this.table(headers, rows.map((row) => headers.map((h) => cell(h, row[h]))));
        return 0;
    }
}
//# sourceMappingURL=DbTableCommand.js.map