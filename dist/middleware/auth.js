import Auth from "../lib/auth/index.js";
import HttpError from "../lib/error.js";
// import { HttpError } from "../errors/HttpError.js";
export async function authMiddleware(req, res, next) {
    try {
        const user = await Auth.user();
        if (!user)
            return next(HttpError.unauthorized("Invalid or expired token"));
        // console.log(user)
        req.user = user;
        res.locals.userId = String(user.id); // keeps existing code that reads res.locals.userId working
        next();
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=auth.js.map