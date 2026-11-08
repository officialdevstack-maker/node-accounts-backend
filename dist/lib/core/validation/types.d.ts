import type { Validator } from "./Validator.js";
export type Data = Record<string, any>;
export interface RuleContext {
    attribute: string;
    value: any;
    params: string[];
    data: Data;
    validator: Validator;
}
/** true = pass, false = fail, string = fail with that message */
export type RuleResult = boolean | string;
export interface RuleSpec {
    passes: (ctx: RuleContext) => RuleResult | Promise<RuleResult>;
    /** Implicit rules run even when the value is missing or empty (like `required`). */
    implicit?: boolean;
}
/** Laravel-style rule object: new MyRule() */
export interface RuleObject {
    passes(value: any, attribute: string, data: Data): boolean | Promise<boolean>;
    message(): string;
}
export type CustomRuleFn = (value: any, attribute: string, data: Data) => RuleResult | Promise<RuleResult>;
export type RuleDefinition = string | RuleObject | CustomRuleFn;
export type Rules = Record<string, string | RuleDefinition[]>;
export type Messages = Record<string, string>;
export type Attributes = Record<string, string>;
export interface ParsedRule extends RuleSpec {
    name: string;
    params: string[];
    message?: string;
}
//# sourceMappingURL=types.d.ts.map