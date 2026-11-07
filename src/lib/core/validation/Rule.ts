// validation/Rule.ts
export const Rule = {
  in: (values: Array<string | number>) => `in:${values.join(",")}`,
  notIn: (values: Array<string | number>) => `not_in:${values.join(",")}`,

  // Rule.unique("users", "email", { ignore: user.id })
  unique: (
    table: string,
    column?: string,
    options: { ignore?: string | number; idColumn?: string } = {}
  ) =>
    `unique:${[table, column ?? "NULL", options.ignore ?? "NULL", options.idColumn ?? "id"].join(",")}`,

  exists: (table: string, column?: string) => `exists:${[table, column ?? "NULL"].join(",")}`,
};

export default Rule;