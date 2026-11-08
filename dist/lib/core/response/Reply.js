import { resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
const serialize = (value) => {
    const text = JSON.stringify(value ?? null, (_key, v) => (typeof v === 'bigint' ? v.toString() : v));
    return text ?? 'null';
};
export class Reply {
    body;
    code;
    headerBag = {};
    cookieBag = [];
    constructor(body, code) {
        this.body = body;
        this.code = Reply.checkStatus(code);
    }
    static json(data, status = 200) {
        return new Reply({ kind: 'json', value: data }, status);
    }
    static success(data, message = 'ok', status = 200) {
        return Reply.json({ message, ...(data !== undefined && { data }) }, status);
    }
    static error(message, status = 400, errors) {
        return Reply.json({ message, ...(errors && { errors }) }, status);
    }
    static paginated(page, message = 'ok') {
        const { data, ...meta } = page;
        return Reply.json({ message, data, meta });
    }
    static text(text, status = 200) {
        return new Reply({ kind: 'text', value: text, type: 'text/plain' }, status);
    }
    static html(html, status = 200) {
        return new Reply({ kind: 'text', value: html, type: 'text/html' }, status);
    }
    static raw(data, type = 'application/octet-stream', status = 200) {
        return new Reply({ kind: 'raw', value: Buffer.from(data), type }, status);
    }
    static stream(stream, type = 'application/octet-stream', status = 200) {
        return new Reply({ kind: 'stream', value: stream, type }, status);
    }
    static noContent() {
        return new Reply({ kind: 'empty' }, 204);
    }
    static redirect(url, status = 302) {
        return new Reply({ kind: 'redirect', url }, status);
    }
    static download(path, name) {
        return new Reply({ kind: 'download', path: resolve(path), name }, 200);
    }
    static file(path) {
        return new Reply({ kind: 'file', path: resolve(path) }, 200);
    }
    status(code) {
        this.code = Reply.checkStatus(code);
        return this;
    }
    header(name, value) {
        this.headerBag[name] = value;
        return this;
    }
    headers(values) {
        Object.assign(this.headerBag, values);
        return this;
    }
    cookie(name, value, options = {}) {
        this.cookieBag.push({ name, value, options });
        return this;
    }
    async send(res) {
        const { body } = this;
        res.status(this.code);
        for (const [name, value] of Object.entries(this.headerBag))
            res.setHeader(name, value);
        for (const { name, value, options } of this.cookieBag)
            res.cookie(name, value, options);
        const typeIfUnset = (type) => {
            if (!res.getHeader('Content-Type'))
                res.type(type);
        };
        switch (body.kind) {
            case 'empty':
                res.end();
                return;
            case 'json':
                typeIfUnset('json');
                res.send(serialize(body.value));
                return;
            case 'text':
            case 'raw':
                typeIfUnset(body.type);
                res.send(body.value);
                return;
            case 'stream':
                typeIfUnset(body.type);
                await pipeline(body.value, res);
                return;
            case 'redirect':
                res.redirect(this.code, body.url);
                return;
            case 'download':
                await new Promise((done, fail) => {
                    const finish = (error) => (error && !res.headersSent ? fail(error) : done());
                    if (body.name)
                        res.download(body.path, body.name, finish);
                    else
                        res.download(body.path, finish);
                });
                return;
            case 'file':
                await new Promise((done, fail) => {
                    res.sendFile(body.path, (error) => (error && !res.headersSent ? fail(error) : done()));
                });
                return;
        }
    }
    static checkStatus(code) {
        if (!Number.isInteger(code) || code < 100 || code > 599)
            throw new RangeError(`Invalid HTTP status code: ${code}`);
        return code;
    }
}
//# sourceMappingURL=Reply.js.map