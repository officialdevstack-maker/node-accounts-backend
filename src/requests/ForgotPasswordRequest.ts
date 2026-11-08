import { FormRequest, type Rules } from '../lib/core/request/index.js';

export class ForgotPasswordRequest extends FormRequest {
  protected prepareForValidation(): void {
    this.merge({ email: this.string('email').trim().toLowerCase() });
  }

  rules(): Rules {
    return {
      email: 'required|email',
    };
  }
}
