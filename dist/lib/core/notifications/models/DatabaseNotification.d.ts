export interface DatabaseNotificationRecord {
    id: string;
    type: string;
    notifiableId: string;
    data: Record<string, unknown>;
    readAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare const DatabaseNotification: {
    create(input: {
        id: string;
        type: string;
        notifiableId: string;
        data: Record<string, unknown>;
    }): Promise<void>;
    forNotifiable(notifiableId: string | number, options?: {
        unreadOnly?: boolean;
        limit?: number;
    }): Promise<DatabaseNotificationRecord[]>;
    unreadCount(notifiableId: string | number): Promise<number>;
    markAsRead(id: string, notifiableId: string | number): Promise<void>;
    markAllAsRead(notifiableId: string | number): Promise<void>;
};
//# sourceMappingURL=DatabaseNotification.d.ts.map