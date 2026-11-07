// File templates for make:controller. They match the style of your existing controllers.

export function controllerStub(cls: string, instance: string, resource: boolean): string {
  const methods = resource
    ? `
    async index(req: Request, res: Response) {
        return res.json({ data: [], message: "ok" })
    }

    async store(req: Request, res: Response) {
        return res.status(201).json({ data: req.body, message: "created" })
    }

    async show(req: Request, res: Response) {
        return res.json({ data: { id: req.params.id }, message: "ok" })
    }

    async update(req: Request, res: Response) {
        return res.json({ data: { id: req.params.id, ...req.body }, message: "updated" })
    }

    async destroy(req: Request, res: Response) {
        return res.json({ message: "deleted" })
    }
`
    : `
    async index(req: Request, res: Response) {
        return res.json({ message: "ok" })
    }
`;

  return `// src/controllers/${cls}.ts
import type { Request, Response } from "express"

class ${cls} {
${methods}
}

export const ${instance} = new ${cls}()
`;
}
