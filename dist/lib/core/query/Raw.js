/** SQL inserted as is. Build it with DB.raw('count(*) as total') and use ? for values: DB.raw('price * ?', [1.5]) */
export class Raw {
    value;
    bindings;
    constructor(value, bindings = []) {
        this.value = value;
        this.bindings = bindings;
    }
    toString() {
        return this.value;
    }
}
//# sourceMappingURL=Raw.js.map