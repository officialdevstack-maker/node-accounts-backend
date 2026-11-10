import { FormRequest, type Rules } from '../lib/core/request/index.js';

export class AdminCreateUserRequest extends FormRequest {
  protected prepareForValidation(): void {
    this.merge({
      fullname: this.string('fullname').trim().replace(/\s+/g, ' '),
      email: this.string('email').trim().toLowerCase(),
      phone: this.string('phone').trim(),
      password: this.string('password'),
      account_type: this.string('account_type', 'user'),
    });
  }

  rules(): Rules {
    return {
      fullname: [
        'required',
        'string',
        'max:120',
        `regex:${String.raw`/^\p{L}[\p{L}'.-]*(?:\s+\p{L}[\p{L}'.-]*)+$/u`}`,
      ],
      email: ['required', 'email', 'unique:users'],
      phone: ['nullable', 'string', `regex:${String.raw`/^\+?[0-9\s-]{7,20}$/`}`],
      password: [
        'required',
        'string',
        'min:8',
        (value) => typeof value !== 'string' || Buffer.byteLength(value, 'utf8') <= 72
          || 'Password must be no more than 72 bytes.',
      ],
      account_type: 'required|in:user,business,developer',
      is_verified: 'sometimes|boolean',
      send_welcome: 'sometimes|boolean',
    };
  }

  messages() {
    return {
      'fullname.regex': 'Must enter first and last names.',
      'phone.regex': 'Enter a valid phone number.',
    };
  }
}
