import { FormRequest, type Rules } from '../lib/core/request/index.js';

export class RegisterUserRequest extends FormRequest {
  protected prepareForValidation(): void {
    this.merge({
      fullname: this.string('fullname').trim(),
      email: this.string('email').trim().toLowerCase(),
      phone: this.string('phone').trim(),
      password: this.string('password'),
      password_confirmation: this.string('password_confirmation'),
    });
  }

  rules(): Rules {
    return {
      fullname: [
        'required',
        'string',
        `regex:${String.raw`/^\p{L}[\p{L}'.-]*(?:\s+\p{L}[\p{L}'.-]*)+$/u`}`,
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
