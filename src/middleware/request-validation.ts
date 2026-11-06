// middleware/validateRequest.ts
import type { NextFunction, Request, Response } from "express";
import type { Attributes, Messages, Rules } from "../lib/validation/types.js";
import Validator from "../lib/validation/Validator.js";
// import { Validator } from "../validation/Validator.js";
// import type { Attributes, Messages, Rules } from "../validation/types.js";

type Options = {
  source?: "body" | "query" | "params";
  messages?: Messages;
  attributes?: Attributes;
};

/** Usage: router.post("/login", validateRequest(rules), handler) */
export function validateRequest(rules: Rules, options: Options = {}) {
  const source = options.source ?? "body";

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await Validator.validate(req[source], rules, options.messages, options.attributes);
      req.validated = { ...req.validated, [source]: data };
      next();
    } catch (err) {
      next(err); // HttpError 422 -> your errorHandler
    }
  };
}

export default validateRequest;