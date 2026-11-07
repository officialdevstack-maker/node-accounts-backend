// File templates for make:controller. They match the style of your existing controllers.

export function controllerStub(cls: string, instance: string, resource: boolean): string {
  const methods = resource
    ? `
    async index(req: Request) {
        return { data: [], message: "ok" }
    }

    async store(req: Request) {
        return { data: req.body, message: "created" }
    }

    async show(req: Request) {
        return { data: { id: req.params.id }, message: "ok" }
    }

    async update(req: Request) {
        return { data: { id: req.params.id, ...req.body }, message: "updated" }
    }

    async destroy(req: Request) {
        return { message: "deleted" }
    }
`
    : `
    async index(req: Request) {
        return { message: "ok" }
    }
`;

  return `// src/controllers/${cls}.ts
import type { Request } from "express"

class ${cls} {
${methods}
}

export const ${instance} = new ${cls}()
`;
}
