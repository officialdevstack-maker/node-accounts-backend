// backend/src/utils/jwt.ts
import jwt  from "jsonwebtoken";
import { SESSION_KEY as JWT_SECRET } from "../config/env.js";

export interface TokenPayload {
  userId: string;
}



class JWT {
    signToken(payload: TokenPayload): string {
        return jwt.sign(payload, JWT_SECRET as string, { expiresIn: "15m" });
    }

    verifyToken(token: string): TokenPayload {
        return jwt.verify(token, JWT_SECRET as string, { algorithms: ["HS256"] }) as TokenPayload;
    }
}


export const web_token = new JWT()