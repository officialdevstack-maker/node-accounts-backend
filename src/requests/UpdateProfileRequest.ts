import { FormRequest, type Rules } from '../lib/core/request/index.js';

export class UpdateProfileRequest extends FormRequest {
  protected prepareForValidation(): void {
    this.merge({
      fullname: this.string('fullname').trim().replace(/\s+/g, ' '),
      phone: this.string('phone').trim(),
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
      phone: ['required', 'string', `regex:${String.raw`/^\+?[0-9\s-]{7,20}$/`}`],
    };
  }

  messages() {
    return {
      'fullname.regex': 'Must enter first and last names.',
      'phone.regex': 'Enter a valid phone number.',
    };
  }
}
