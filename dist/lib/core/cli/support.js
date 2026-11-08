// cli/support.ts
// Small helpers for the generators.
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
/** The folder that holds cli/, mail/, config/, ... (the parent of cli/). Generators write relative to it. */
export const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
export const appPath = (...parts) => join(appRoot, ...parts);
/** Path shown to the user, relative to where they ran the command. */
export const displayPath = (absolute) => relative(process.cwd(), absolute) || absolute;
/** 'wallet_credited' | 'wallet-credited' | 'wallet credited' | 'WalletCredited' -> 'WalletCredited' */
export function toPascal(input) {
    return input
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join('');
}
/** 'SendReports' -> 'send-reports' */
export const toKebab = (input) => input.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase();
/** 'WalletCredited' -> 'Wallet credited' */
export const humanize = (input) => {
    const words = input.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
    return words.charAt(0).toUpperCase() + words.slice(1);
};
/** Turn user input into a class name that always ends with `suffix`: ('welcome', 'Mail') -> 'WelcomeMail'. */
export function className(input, suffix) {
    const pascal = toPascal(input);
    if (!pascal || !/^[A-Za-z]/.test(pascal))
        throw new Error(`"${input}" is not a valid class name.`);
    const stem = pascal.endsWith(suffix) && pascal.length > suffix.length ? pascal.slice(0, -suffix.length) : pascal;
    return { full: `${stem}${suffix}`, stem };
}
export async function writeFileSafe(path, content, force = false) {
    const already = existsSync(path);
    if (already && !force)
        return 'exists';
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, 'utf8');
    return already ? 'overwritten' : 'created';
}
/** Append `line` to an index.ts barrel if the file exists and doesn't already contain it. */
export async function addExport(indexFile, line) {
    if (!existsSync(indexFile))
        return false;
    const current = await readFile(indexFile, 'utf8');
    if (current.includes(line))
        return false;
    await appendFile(indexFile, `${current.endsWith('\n') ? '' : '\n'}${line}\n`, 'utf8');
    return true;
}
//# sourceMappingURL=support.js.map