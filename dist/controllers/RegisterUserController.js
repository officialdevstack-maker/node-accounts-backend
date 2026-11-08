import Auth from "../lib/auth/index.js";
import { Controller } from "../lib/core/controller/index.js";
import { Mail, WelcomeMail } from "../lib/core/mail/index.js";
import { User } from "../models/User.js";
class RegisterUserController extends Controller {
    async create(req) {
        const data = req.validated();
        const user = await User.create({
            fullname: data.fullname,
            email: data.email,
            phone: data.phone,
            password: data.password,
        });
        const auth = await Auth.login(user);
        const token = Auth.token();
        await Mail.to(user.email).send(new WelcomeMail(user));
        return this.ok({ auth, token, user }, "successfully registered");
    }
}
export const registerUserController = new RegisterUserController();
//# sourceMappingURL=RegisterUserController.js.map