// validation/MessageBag.ts
export class MessageBag {
  private bag = new Map<string, string[]>();

  add(key: string, message: string): this {
    const list = this.bag.get(key) ?? [];
    if (!list.includes(message)) list.push(message);
    this.bag.set(key, list);
    return this;
  }

  has(key: string): boolean {
    return this.bag.has(key);
  }

  get(key: string): string[] {
    return this.bag.get(key) ?? [];
  }

  first(key?: string): string | null {
    if (key) return this.bag.get(key)?.[0] ?? null;
    for (const list of this.bag.values()) return list[0] ?? null;
    return null;
  }

  all(): string[] {
    return [...this.bag.values()].flat();
  }

  keys(): string[] {
    return [...this.bag.keys()];
  }

  count(): number {
    return this.all().length;
  }

  isEmpty(): boolean {
    return this.bag.size === 0;
  }

  any(): boolean {
    return !this.isEmpty();
  }

  toObject(): Record<string, string[]> {
    return Object.fromEntries(this.bag);
  }

  toJSON() {
    return this.toObject();
  }
}