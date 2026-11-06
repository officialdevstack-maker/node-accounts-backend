// validation/helpers.ts
import type { Data } from "./types.js";

const hasOwn = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const UNSAFE = new Set(["__proto__", "constructor", "prototype"]);

export const isBlank = (v: unknown): boolean =>
  v === undefined ||
  v === null ||
  (typeof v === "string" && v.trim() === "") ||
  (Array.isArray(v) && v.length === 0);

/** getByPath(data, "items.0.name") */
export function getByPath(obj: any, path: string): any {
  let cur = obj;
  for (const seg of path.split(".")) {
    if (cur === null || typeof cur !== "object" || !hasOwn(cur, seg)) return undefined;
    cur = cur[seg];
  }
  return cur;
}

export function hasPath(obj: any, path: string): boolean {
  let cur = obj;
  for (const seg of path.split(".")) {
    if (cur === null || typeof cur !== "object" || !hasOwn(cur, seg)) return false;
    cur = cur[seg];
  }
  return true;
}

export function setByPath(obj: Data, path: string, value: unknown): void {
  const segs = path.split(".");
  if (segs.some((s) => UNSAFE.has(s))) return; // block prototype pollution

  let cur: any = obj;
  segs.forEach((seg, i) => {
    if (i === segs.length - 1) {
      cur[seg] = value;
      return;
    }
    if (cur[seg] === undefined || cur[seg] === null || typeof cur[seg] !== "object") {
      cur[seg] = /^\d+$/.test(segs[i + 1]) ? [] : {};
    }
    cur = cur[seg];
  });
}

/** Expands "items.*.name" into ["items.0.name", "items.1.name", ...] using the data. */
export function expandPath(data: Data, pattern: string): string[] {
  if (!pattern.includes("*")) return [pattern];

  let paths: string[] = [""];
  for (const seg of pattern.split(".")) {
    const next: string[] = [];
    for (const base of paths) {
      if (seg !== "*") {
        next.push(base ? `${base}.${seg}` : seg);
        continue;
      }
      const target = base ? getByPath(data, base) : data;
      if (Array.isArray(target)) {
        target.forEach((_, i) => next.push(base ? `${base}.${i}` : String(i)));
      } else if (target && typeof target === "object") {
        Object.keys(target).forEach((k) => next.push(base ? `${base}.${k}` : k));
      }
    }
    paths = next;
  }
  return paths;
}
