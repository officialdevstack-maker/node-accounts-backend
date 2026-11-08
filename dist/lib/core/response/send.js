import { Readable } from 'node:stream';
import { Reply } from './Reply.js';
const isResponsable = (value) => typeof value === 'object' && value !== null && typeof value.toResponse === 'function';
export async function sendResult(res, result) {
    if (res.headersSent || res.writableEnded || result === res)
        return;
    if (result instanceof Reply)
        return result.send(res);
    if (isResponsable(result))
        return sendResult(res, await result.toResponse());
    if (result instanceof Error)
        throw result;
    if (result === undefined)
        return Reply.noContent().send(res);
    if (typeof result === 'string')
        return Reply.text(result).send(res);
    if (result instanceof Uint8Array)
        return Reply.raw(result).send(res);
    if (result instanceof Readable)
        return Reply.stream(result).send(res);
    if (typeof result === 'function' || typeof result === 'symbol') {
        throw new TypeError(`A route handler returned a ${typeof result}, which cannot be sent as a response.`);
    }
    return Reply.json(result).send(res);
}
//# sourceMappingURL=send.js.map