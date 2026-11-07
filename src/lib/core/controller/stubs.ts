// File templates for make:controller.
export interface ControllerStubOptions {
  cls: string;
  instance: string;
  /** Import path to controller/index.js, relative to the new file. */
  importPath: string;
  resource: boolean;
}

export function controllerStub({ cls, instance, importPath, resource }: ControllerStubOptions): string {
  const methods = resource
    ? `  async index(req: Request) {
    // const { page, perPage } = this.pageParams(req);
    // return this.paginated(await DB.table('things').orderByDesc('id').paginate(perPage, page));
    return this.ok([]);
  }

  async store(req: Request) {
    const data = await this.validate(req, {
      // name: 'required|string|max:255',
    });
    return this.created(data);
  }

  async show(req: Request) {
    return this.ok({ id: req.params.id });
  }

  async update(req: Request) {
    const data = await this.validate(req, {
      // name: 'sometimes|string|max:255',
    });
    return this.ok({ id: req.params.id, ...data }, 'updated');
  }

  async destroy(req: Request) {
    return this.noContent();
  }`
    : `  async index(req: Request) {
    return this.ok([]);
  }`;

  return `// src/controllers/${cls}.ts
import type { Request } from 'express';
import { Controller } from '${importPath}';

class ${cls} extends Controller {
${methods}
}

export const ${instance} = new ${cls}();
`;
}
