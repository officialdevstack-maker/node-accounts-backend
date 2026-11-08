export declare const e: (value: unknown) => string;
export declare const paragraph: (text: string) => string;
export declare const button: (url: string, label: string) => string;
export declare const codeBox: (code: string) => string;
export interface LayoutOptions {
    title: string;
    body: string;
    preheader?: string;
}
export declare function layout({ title, body, preheader }: LayoutOptions): string;
//# sourceMappingURL=layout.d.ts.map