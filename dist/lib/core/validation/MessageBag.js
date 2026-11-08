// validation/MessageBag.ts
export class MessageBag {
    bag = new Map();
    add(key, message) {
        const list = this.bag.get(key) ?? [];
        if (!list.includes(message))
            list.push(message);
        this.bag.set(key, list);
        return this;
    }
    has(key) {
        return this.bag.has(key);
    }
    get(key) {
        return this.bag.get(key) ?? [];
    }
    first(key) {
        if (key)
            return this.bag.get(key)?.[0] ?? null;
        for (const list of this.bag.values())
            return list[0] ?? null;
        return null;
    }
    all() {
        return [...this.bag.values()].flat();
    }
    keys() {
        return [...this.bag.keys()];
    }
    count() {
        return this.all().length;
    }
    isEmpty() {
        return this.bag.size === 0;
    }
    any() {
        return !this.isEmpty();
    }
    toObject() {
        return Object.fromEntries(this.bag);
    }
    toJSON() {
        return this.toObject();
    }
}
//# sourceMappingURL=MessageBag.js.map