import { FormRequest } from '../lib/core/request/index.js';
export class RegisterUserRequest extends FormRequest {
    prepareForValidation() {
        this.merge({
            fullname: this.string('fullname').trim(),
            email: this.string('email').trim().toLowerCase(),
            phone: this.string('phone').trim(),
        });
    }
    rules() {
        return {
            fullname: [
                'required',
                'string',
                `regex:${String.raw `/^\p{L}[\p{L}'.-]*(?:\s+\p{L}[\p{L}'.-]*)+$/u`}`,
            ],
            email: ['required', 'unique:users', 'email'],
            phone: ['required', 'string'],
            password: 'required|string|min:8|confirmed',
        };
    }
    messages() {
        return {
            'fullname.regex': 'Must enter first and last names',
        };
    }
}
//# sourceMappingURL=RegisterUserRequest.js.map