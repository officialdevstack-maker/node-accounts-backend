import { MessageBag } from "./MessageBag.js";
import type { Attributes, Data, Messages, RuleResult, Rules } from "./types.js";
export declare class Validator {
    private readonly data;
    private readonly ruleSet;
    private readonly customMessages;
    private readonly customAttributes;
    private readonly _errors;
    private _validated;
    private _ran;
    /** concrete attribute ("items.0.name") -> its rules */
    private readonly _rules;
    /** concrete attribute -> the pattern it came from ("items.*.name") */
    private readonly patterns;
    constructor(data: Data, ruleSet: Rules, customMessages?: Messages, customAttributes?: Attributes);
    /** const v = Validator.make(req.body, rules); if (await v.fails()) ... */
    static make(data: Data, rules: Rules, messages?: Messages, attributes?: Attributes): Validator;
    /** Validates and returns clean data, or throws HttpError 422 (like $request->validate()). */
    static validate<T = Data>(data: Data, rules: Rules, messages?: Messages, attributes?: Attributes): Promise<T>;
    /** Register a custom rule: Validator.extend("phone_ng", (value) => ..., "message") */
    static extend(name: string, fn: (value: any, attribute: string, params: string[], data: Data) => RuleResult | Promise<RuleResult>, message?: string, implicit?: boolean): void;
    passes(): Promise<boolean>;
    fails(): Promise<boolean>;
    errors(): MessageBag;
    /** Runs, then returns validated data or throws HttpError 422. */
    validate<T = Data>(): Promise<T>;
    /** Call after passes()/fails()/validate(). Throws HttpError 422 if validation failed. */
    validated<T = Data>(): T;
    getType(attribute: string, value: any): "numeric" | "string" | "array";
    getSize(attribute: string, value: any): number;
    private run;
    /** Same skipping rules as Laravel: absent/"" skip non-implicit rules, null skips only if nullable. */
    private shouldValidate;
    private displayName;
    private makeMessage;
}
export default Validator;
//# sourceMappingURL=Validator.d.ts.map