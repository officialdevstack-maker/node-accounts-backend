import { FormRequest, type Rules } from '../lib/core/request/index.js';

export class ChangePasswordRequest extends FormRequest {
  protected prepareForValidation(): void {
    this.merge({
      current_password: this.string('current_password'),
      password: this.string('password'),
      password_confirmation: this.string('password_confirmation'),
    });
  }

  rules(): Rules {
    return {
      current_password: 'required|string',
      password: 'required|string|min:8|confirmed|different:current_password',
    };
  }

  messages() {
    return {
      'password.different': 'Your new password must be different from the current one.',
    };
  }
}
