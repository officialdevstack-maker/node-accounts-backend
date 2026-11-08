export type AccountType = 'user' | 'business' | 'developer';
export interface User {
    id: number;
    fullname: string;
    email: string;
    phone: string | null;
    isVerified: boolean;
    accountType: AccountType;
    createdAt: Date;
    updatedAt: Date;
}
export interface UserWithPassword extends User {
    password: string;
}
export declare const User: {
    findById(id: number): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    /** Only for credential checks. Everything else should use the methods above (no password column). */
    findByEmailWithPassword(email: string): Promise<UserWithPassword | null>;
    create(input: {
        fullname: string;
        email: string;
        password: string;
        phone?: string | null;
        accountType?: AccountType;
    }): Promise<User>;
};
//# sourceMappingURL=User.d.ts.map