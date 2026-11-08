/** 'user' -> 'users', 'category' -> 'categories', 'address' -> 'addresses', 'user_profile' -> 'user_profiles' */
export declare function pluralize(word: string): string;
/** 'UserProfile' | 'user-profile' | 'user profile' -> 'user_profile' */
export declare const toSnake: (input: string) => string;
/** 2026_11_07_103045  (sorts correctly as text, so migrations run in creation order) */
export declare function migrationTimestamp(date?: Date): string;
export declare const quoteId: (name: string) => string;
/** For DDL defaults only. Query values always go through bindings. */
export declare function quoteValue(value: unknown): string;
//# sourceMappingURL=support.d.ts.map