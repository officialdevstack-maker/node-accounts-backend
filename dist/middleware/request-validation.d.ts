import type { NextFunction, Request, Response } from "express";
import type { Attributes, Messages, Rules } from "../lib/core/validation/types.js";
type Options = {
    source?: "body" | "query" | "params";
    messages?: Messages;
    attributes?: Attributes;
};
/** Usage: router.post("/login", validateRequest(rules), handler) */
export declare function validateRequest(rules: Rules, options?: Options): (req: Request, _res: Response, next: NextFunction) => Promise<void>;
export default validateRequest;
//# sourceMappingURL=request-validation.d.ts.map