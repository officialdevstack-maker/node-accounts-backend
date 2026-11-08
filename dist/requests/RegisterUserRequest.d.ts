import { FormRequest, type Rules } from '../lib/core/request/index.js';
export declare class RegisterUserRequest extends FormRequest {
    protected prepareForValidation(): void;
    rules(): Rules;
    messages(): {
        'fullname.regex': string;
    };
}
//# sourceMappingURL=RegisterUserRequest.d.ts.map