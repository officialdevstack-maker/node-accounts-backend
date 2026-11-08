import type { Response } from 'express';
export interface Responsable {
    toResponse(): unknown | Promise<unknown>;
}
export declare function sendResult(res: Response, result: unknown): Promise<void>;
//# sourceMappingURL=send.d.ts.map