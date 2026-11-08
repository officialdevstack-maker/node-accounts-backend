import HttpError from '../../error.js';
import type { Attributes, Messages, Rules } from '../validation/types.js';
import { HttpRequest } from './HttpRequest.js';

/** Validation + authorization in one class. Attach it to a route with .request(MyRequest). */
export abstract class FormRequest extends HttpRequest {
  protected authorize(): boolean {
    return true;
  }

  protected rules(): Rules {
    return {};
  }

  protected messages(): Messages {
    return {};
  }

  protected attributes(): Attributes {
    return {};
  }

  protected prepareForValidation(): void | Promise<void> {
    return undefined;
  }

  protected passedValidation(): void | Promise<void> {
    return undefined;
  }

  protected failedAuthorization(): never {
    throw HttpError.forbidden();
  }

  async validateResolved(): Promise<void> {
    await this.prepareForValidation();
    if (!(await this.authorize())) this.failedAuthorization();

    await this.validate(this.rules(), this.messages(), this.attributes());
    await this.passedValidation();
  }
}
