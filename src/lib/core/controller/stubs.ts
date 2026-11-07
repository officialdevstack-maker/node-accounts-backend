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
    ? `  async index(req: Request, res: Response) {
    // const { page, perPage } = this.pageParams(req);
    // return this.paginated(res, await DB.table('things').orderByDesc('id').paginate(perPage, page));
    return this.ok(res, []);
  }

  async store(req: Request, res: Response) {
    const data = await this.validate(req, {
      // name: 'required|string|max:255',
    });
    return this.created(res, data);
  }

  async show(req: Request, res: Response) {
    return this.ok(res, { id: req.params.id });
  }

  async update(req: Request, res: Response) {
    const data = await this.validate(req, {
      // name: 'sometimes|string|max:255',
    });
    return this.ok(res, { id: req.params.id, ...data }, 'updated');
  }

  async destroy(req: Request, res: Response) {
    return this.ok(res, undefined, 'deleted');
  }`
    : `  async index(req: Request, res: Response) {
    return this.ok(res, []);
  }`;

  return `// src/controllers/${cls}.ts
import type { Request, Response } from 'express';
import { Controller } from '${importPath}';

class ${cls} extends Controller {
${methods}
}

export const ${instance} = new ${cls}();
`;
}
