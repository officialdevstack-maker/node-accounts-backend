export function requestStub(cls: string, importPath: string): string {
  return `// src/requests/${cls}.ts
import { FormRequest, type Rules } from '${importPath}';

export class ${cls} extends FormRequest {
  // authorize(): boolean {
  //   return this.user !== undefined;
  // }

  // protected prepareForValidation(): void {
  //   this.merge({ email: this.string('email').trim().toLowerCase() });
  // }

  rules(): Rules {
    return {
      // name: 'required|string|max:255',
    };
  }

  // override messages() {
  //   return { 'name.required': 'Please enter a name.' };
  // }
}
`;
}
