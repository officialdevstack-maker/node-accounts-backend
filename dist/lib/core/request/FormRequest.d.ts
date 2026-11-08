import type { Attributes, Messages, Rules } from '../validation/types.js';
import { HttpRequest } from './HttpRequest.js';
/** Validation + authorization in one class. Attach it to a route with .request(MyRequest). */
export declare abstract class FormRequest extends HttpRequest {
    protected authorize(): boolean;
    protected rules(): Rules;
    protected messages(): Messages;
    protected attributes(): Attributes;
    protected prepareForValidation(): void | Promise<void>;
    protected passedValidation(): void | Promise<void>;
    protected failedAuthorization(): never;
    validateResolved(): Promise<void>;
}
//# sourceMappingURL=FormRequest.d.ts.map