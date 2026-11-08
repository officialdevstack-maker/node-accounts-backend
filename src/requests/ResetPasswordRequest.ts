import { FormRequest, type Rules } from '../lib/core/request/index.js';

export class ResetPasswordRequest extends FormRequest {
  protected prepareForValidation(): void {
    this.merge({
      token: this.string('token').trim(),
      email: this.string('email').trim().toLowerCase(),
      password: this.string('password'),
      password_confirmation: this.string('password_confirmation'),
    });
  }

  rules(): Rules {
    return {
      token: 'required|string',
      email: 'required|email',
      password: 'required|string|min:8|confirmed',
    };
  }
}
