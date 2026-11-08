export interface AccessTokenRecord {
    id: number;
    userId: number;
    tokenHash: string;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
}
export declare const AccessToken: {
    create(input: {
        userId: number;
        tokenHash: string;
        expiresAt: Date | null;
    }): Promise<void>;
    findValid(tokenHash: string): Promise<AccessTokenRecord | null>;
    touch(id: number): Promise<void>;
    destroyByHash(tokenHash: string): Promise<void>;
    destroyByUser(userId: number): Promise<void>;
};
//# sourceMappingURL=AccessToken.d.ts.map