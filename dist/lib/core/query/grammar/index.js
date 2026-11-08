import { MySqlGrammar } from './MySqlGrammar.js';
export { Grammar } from './Grammar.js';
export { MySqlGrammar };
export function grammarFor(dialect) {
    if (dialect !== 'mysql' && dialect !== 'mariadb') {
        throw new Error(`The query builder only supports MySQL (received "${dialect}").`);
    }
    return new MySqlGrammar();
}
//# sourceMappingURL=index.js.map