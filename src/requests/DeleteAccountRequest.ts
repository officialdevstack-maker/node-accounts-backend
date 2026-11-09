import { FormRequest, type Rules } from '../lib/core/request/index.js';

export class DeleteAccountRequest extends FormRequest {
  protected prepareForValidation(): void {
    this.merge({ password: this.string('password') });
  }

  rules(): Rules {
    return {
      password: 'required|string',
    };
  }
}
