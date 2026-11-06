// backend/src/middleware/auth.ts
import type { Request, Response, NextFunction } from "express";
import { web_token } from "../lib/jwt.js";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    const payload = web_token.verifyToken(header.slice(7));
    res.locals.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}