// validation/Validator.ts
// import { HttpError } from "../errors/HttpError.js";
// import { defaultMessages, FALLBACK_MESSAGE } from "./messages.js";
import { MessageBag } from "./MessageBag.js";
import { ruleRegistry } from "./rules.js";
import { expandPath, getByPath, hasPath, setByPath } from "./helpers.js";
import type {
  Attributes,
  Data,
  Messages,
  ParsedRule,
  RuleDefinition,
  RuleResult,
  Rules,
} from "./types.js";
import { defaultMessages, FALLBACK_MESSAGE } from "./message.js";
import HttpError from "../../error.js";

const MARKERS = new Set(["bail", "nullable", "sometimes"]);
const REGEX_RULES = new Set(["regex", "not_regex"]); // their params may contain commas

function parseRules(definition: string | RuleDefinition[]): ParsedRule[] {
  const items = typeof definition === "string" ? definition.split("|") : definition;
  const parsed: ParsedRule[] = [];

  for (const item of items) {
    if (typeof item === "string") {
      if (!item.trim()) continue;

      const idx = item.indexOf(":");
      const name = (idx === -1 ? item : item.slice(0, idx)).trim();
      const raw = idx === -1 ? "" : item.slice(idx + 1);

      if (!Object.prototype.hasOwnProperty.call(ruleRegistry, name)) {
        throw new Error(`Validation rule "${name}" does not exist.`);
      }

      const params =
        raw === "" ? [] : REGEX_RULES.has(name) ? [raw] : raw.split(",").map((s) => s.trim());
      const spec = ruleRegistry[name];
      if (!spec) throw new Error(`Validation rule "${name}" does not exist.`);

      parsed.push({ ...spec, name, params });
    } else if (typeof item === "function") {
      parsed.push({
        name: "custom",
        params: [],
        passes: ({ value, attribute, data }) => item(value, attribute, data),
      });
    } else {
      parsed.push({
        name: "custom",
        params: [],
        message: item.message(),
        passes: ({ value, attribute, data }) => item.passes(value, attribute, data),
      });
    }
  }
  return parsed;
}

export class Validator {
  private readonly _errors = new MessageBag();
  private _validated: Data = {};
  private _ran = false;

  /** concrete attribute ("items.0.name") -> its rules */
  private readonly _rules = new Map<string, ParsedRule[]>();
  /** concrete attribute -> the pattern it came from ("items.*.name") */
  private readonly patterns = new Map<string, string>();

  constructor(
    private readonly data: Data,
    private readonly ruleSet: Rules,
    private readonly customMessages: Messages = {},
    private readonly customAttributes: Attributes = {}
  ) {}

  // ---------- static API ----------

  /** const v = Validator.make(req.body, rules); if (await v.fails()) ... */
  static make(
    data: object,
    rules: Rules,
    messages: Messages = {},
    attributes: Attributes = {}
  ): Validator {
    return new Validator(data as Data, rules, messages, attributes);
  }

  /** Validates and returns clean data, or throws HttpError 422 (like $request->validate()). */
  static validate<T = Data>(
    data: object,
    rules: Rules,
    messages: Messages = {},
    attributes: Attributes = {}
  ): Promise<T> {
    return Validator.make(data, rules, messages, attributes).validate<T>();
  }

  /** Register a custom rule: Validator.extend("phone_ng", (value) => ..., "message") */
  static extend(
    name: string,
    fn: (
      value: any,
      attribute: string,
      params: string[],
      data: Data
    ) => RuleResult | Promise<RuleResult>,
    message?: string,
    implicit = false
  ): void {
    ruleRegistry[name] = {
      implicit,
      passes: ({ value, attribute, params, data }) => fn(value, attribute, params, data),
    };
    if (message) defaultMessages[name] = message;
  }

  // ---------- instance API ----------

  async passes(): Promise<boolean> {
    await this.run();
    return this._errors.isEmpty();
  }

  async fails(): Promise<boolean> {
    return !(await this.passes());
  }

  errors(): MessageBag {
    return this._errors;
  }

  /** Runs, then returns validated data or throws HttpError 422. */
  async validate<T = Data>(): Promise<T> {
    await this.run();
    return this.validated<T>();
  }

  /** Call after passes()/fails()/validate(). Throws HttpError 422 if validation failed. */
  validated<T = Data>(): T {
    if (!this._ran) throw new Error("Call passes(), fails() or validate() before validated().");
    if (!this._errors.isEmpty()) {
      throw HttpError.unprocessable("Validation failed.", this._errors.toObject());
    }
    return this._validated as T;
  }

  // ---------- size helpers (used by min/max/between/size) ----------

  getType(attribute: string, value: any): "numeric" | "string" | "array" {
    if (typeof value === "number") return "numeric";
    if (Array.isArray(value)) return "array";
    const names = this._rules.get(attribute)?.map((r) => r.name) ?? [];
    return names.includes("numeric") || names.includes("integer") ? "numeric" : "string";
  }

  getSize(attribute: string, value: any): number {
    const type = this.getType(attribute, value);
    if (type === "numeric") return Number(value);
    if (type === "array") return (value as unknown[]).length;
    return [...String(value ?? "")].length; // unicode-safe length
  }

  // ---------- engine ----------

  private async run(): Promise<void> {
    if (this._ran) return;
    this._ran = true;

    // 1) expand wildcards and parse rules
    for (const [pattern, definition] of Object.entries(this.ruleSet)) {
      const parsed = parseRules(definition);
      for (const attribute of expandPath(this.data, pattern)) {
        this.patterns.set(attribute, pattern);
        this._rules.set(attribute, [...(this._rules.get(attribute) ?? []), ...parsed]);
      }
    }

    // 2) run them
    for (const [attribute, list] of this._rules) {
      const present = hasPath(this.data, attribute);
      const value = getByPath(this.data, attribute);
      const names = new Set(list.map((r) => r.name));

      if (names.has("sometimes") && !present) continue;

      const nullable = names.has("nullable");
      const bail = names.has("bail");
      let failed = false;

      for (const rule of list) {
        if (MARKERS.has(rule.name)) continue;
        if (!this.shouldValidate(rule, value, nullable)) continue;

        const result = await rule.passes({
          attribute,
          value,
          params: rule.params,
          data: this.data,
          validator: this,
        });
        if (result === true) continue;

        failed = true;
        this._errors.add(
          attribute,
          this.makeMessage(attribute, rule, value, typeof result === "string" ? result : undefined)
        );
        if (bail) break;
      }

      if (!failed && present) setByPath(this._validated, attribute, value);
    }
  }

  /** Same skipping rules as Laravel: absent/"" skip non-implicit rules, null skips only if nullable. */
  private shouldValidate(rule: ParsedRule, value: any, nullable: boolean): boolean {
    if (rule.implicit) return true;
    if (value === undefined) return false;
    if (value === null) return !nullable;
    if (typeof value === "string" && value.trim() === "") return false;
    return true;
  }

  // ---------- messages ----------

  private displayName(attribute: string): string {
    const pattern = this.patterns.get(attribute);
    return (
      this.customAttributes[attribute] ??
      (pattern ? this.customAttributes[pattern] : undefined) ??
      attribute.replace(/_/g, " ")
    );
  }

  private makeMessage(attribute: string, rule: ParsedRule, value: any, override?: string): string {
    const pattern = this.patterns.get(attribute) ?? attribute;

    let template =
      this.customMessages[`${attribute}.${rule.name}`] ??
      this.customMessages[`${pattern}.${rule.name}`] ??
      this.customMessages[rule.name] ??
      override ??
      rule.message;

    if (!template) {
      const def = defaultMessages[rule.name];
      template =
        typeof def === "string" ? def : def ? def[this.getType(attribute, value)] : FALLBACK_MESSAGE;
    }

    const p = rule.params;
    const replace: Record<string, string> = { attribute: this.displayName(attribute) };
    const first = p[0] ?? "";
    const second = p[1] ?? "";

    switch (rule.name) {
      case "min":
      case "max":
      case "between":
      case "digits_between":
        replace.min = first;
        replace.max = rule.name === "max" ? first : second;
        break;
      case "size":
        replace.size = first;
        break;
      case "digits":
        replace.digits = first;
        break;
      case "same":
      case "different":
        replace.other = this.displayName(first);
        break;
      case "required_if":
      case "required_unless":
        replace.other = this.displayName(first);
        replace.value = p.slice(1).join(", ");
        break;
      case "required_with":
      case "required_without":
        replace.values = p.map((x) => this.displayName(x)).join(" / ");
        break;
      case "in":
      case "not_in":
      case "starts_with":
      case "ends_with":
        replace.values = p.join(", ");
        break;
      case "after":
      case "after_or_equal":
      case "before":
      case "before_or_equal":
        replace.date = this.displayName(first);
        break;
    }

    return template.replace(/:(\w+)/g, (m, key: string) => replace[key] ?? m);
  }
}

export default Validator;