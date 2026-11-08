import Validator from "../lib/core/validation/Validator.js";
/** Usage: router.post("/login", validateRequest(rules), handler) */
export function validateRequest(rules, options = {}) {
    const source = options.source ?? "body";
    return async (req, _res, next) => {
        try {
            const data = await Validator.validate(req[source], rules, options.messages, options.attributes);
            req.validated = { ...req.validated, [source]: data };
            next();
        }
        catch (err) {
            next(err); // HttpError 422 -> your errorHandler
        }
    };
}
export default validateRequest;
//# sourceMappingURL=request-validation.js.map