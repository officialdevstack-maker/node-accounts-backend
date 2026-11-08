export function modelStub(cls: string, table: string, importPath: string): string {
  return `import { Model } from '${importPath}';

export class ${cls} extends Model {
  static table = '${table}';
  static fillable: string[] = [];
  static hidden: string[] = [];

  declare id: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}
`;
}
