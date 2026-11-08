// validation/Rule.ts
export const Rule = {
    in: (values) => `in:${values.join(",")}`,
    notIn: (values) => `not_in:${values.join(",")}`,
    // Rule.unique("users", "email", { ignore: user.id })
    unique: (table, column, options = {}) => `unique:${[table, column ?? "NULL", options.ignore ?? "NULL", options.idColumn ?? "id"].join(",")}`,
    exists: (table, column) => `exists:${[table, column ?? "NULL"].join(",")}`,
};
export default Rule;
//# sourceMappingURL=Rule.js.map