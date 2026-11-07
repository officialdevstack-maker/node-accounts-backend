/** SQL inserted as is. Build it with DB.raw('count(*) as total') and use ? for values: DB.raw('price * ?', [1.5]) */
export class Raw {
  constructor(
    readonly value: string,
    readonly bindings: readonly unknown[] = [],
  ) {}

  toString(): string {
    return this.value;
  }
}
