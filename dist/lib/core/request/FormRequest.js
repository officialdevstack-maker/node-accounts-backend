import HttpError from '../../error.js';
import { HttpRequest } from './HttpRequest.js';
/** Validation + authorization in one class. Attach it to a route with .request(MyRequest). */
export class FormRequest extends HttpRequest {
    authorize() {
        return true;
    }
    rules() {
        return {};
    }
    messages() {
        return {};
    }
    attributes() {
        return {};
    }
    prepareForValidation() {
        return undefined;
    }
    passedValidation() {
        return undefined;
    }
    failedAuthorization() {
        throw HttpError.forbidden();
    }
    async validateResolved() {
        await this.prepareForValidation();
        if (!(await this.authorize()))
            this.failedAuthorization();
        await this.validate(this.rules(), this.messages(), this.attributes());
        await this.passedValidation();
    }
}
//# sourceMappingURL=FormRequest.js.map