import { config } from '../config/index.js';
import type { Notification } from './Notification.js';
import type { Notifiable } from './types.js';

export interface NotificationChannels {
  database?: { data: Record<string, unknown> };
  mail?: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    replyTo?: string;
    priority?: 'high' | 'normal' | 'low';
  };
  sms?: { to: string; message: string };
}

export interface NotificationRequest {
  id: string;
  notifiableId: string;
  type: string;
  queue: boolean;
  delayMs: number;
  channels: NotificationChannels;
}

export interface RemoteNotification {
  id: string;
  type: string;
  notifiableId: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function mailPayload(
  notification: Notification,
  notifiable: Notifiable,
  address: string,
): Promise<NonNullable<NotificationChannels['mail']>> {
  if (!notification.toMail) {
    throw new Error(`${notification.type} uses the "mail" channel but has no toMail() method.`);
  }
  const options = await notification.toMail(notifiable).toMailOptions({ to: [address] });
  if (
    typeof options.subject !== 'string' ||
    (!options.text && !options.html) ||
    (options.text !== undefined && typeof options.text !== 'string') ||
    (options.html !== undefined && typeof options.html !== 'string') ||
    (Array.isArray(options.to) && options.to.length > 1) ||
    (options.cc && (Array.isArray(options.cc) ? options.cc.length > 0 : true)) ||
    (options.bcc && (Array.isArray(options.bcc) ? options.bcc.length > 0 : true)) ||
    options.attachments?.length ||
    (options.headers && Object.keys(options.headers).length)
  ) {
    throw new Error(`${notification.type} uses email options unsupported by the admin-2 service.`);
  }
  if (options.replyTo !== undefined && typeof options.replyTo !== 'string') {
    throw new Error(`${notification.type} uses an unsupported reply-to address.`);
  }

  return {
    to: address,
    subject: options.subject,
    ...(typeof options.text === 'string' ? { text: options.text } : {}),
    ...(typeof options.html === 'string' ? { html: options.html } : {}),
    ...(typeof options.replyTo === 'string' ? { replyTo: options.replyTo } : {}),
    ...(options.priority === 'high' || options.priority === 'normal' || options.priority === 'low'
      ? { priority: options.priority }
      : {}),
  };
}

function endpoint(path: string): URL {
  const baseUrl = config('notifications.serviceUrl');
  if (!baseUrl) throw new Error('NOTIFICATIONS_SERVICE_URL must be configured.');
  return new URL(path, `${baseUrl.replace(/\/+$/, '')}/`);
}

function authorization(): string {
  const apiKey = config('notifications.serviceApiKey');
  if (!apiKey) throw new Error('NOTIFICATIONS_SERVICE_API_KEY must be configured.');
  return `Bearer ${apiKey}`;
}

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(endpoint(path), {
    ...init,
    headers: {
      Authorization: authorization(),
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
  const body: unknown = await response.json();

  if (!response.ok) {
    const message =
      body !== null && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
        ? body.message
        : 'Unknown notification service error.';
    throw new Error(`Notification service returned ${response.status}: ${message}`);
  }
  return body;
}

function responseData(value: unknown): unknown {
  if (value === null || typeof value !== 'object' || !('data' in value)) {
    throw new Error('Notification service returned an invalid response.');
  }
  return value.data;
}

function isRemoteNotification(value: unknown): value is RemoteNotification {
  return (
    value !== null &&
    typeof value === 'object' &&
    'id' in value &&
    typeof value.id === 'string' &&
    'type' in value &&
    typeof value.type === 'string' &&
    'notifiableId' in value &&
    typeof value.notifiableId === 'string' &&
    'data' in value &&
    value.data !== null &&
    typeof value.data === 'object' &&
    'readAt' in value &&
    (typeof value.readAt === 'string' || value.readAt === null) &&
    'createdAt' in value &&
    typeof value.createdAt === 'string' &&
    'updatedAt' in value &&
    typeof value.updatedAt === 'string'
  );
}

export async function sendNotification(notification: NotificationRequest): Promise<void> {
  await request('api/v1/notifications', {
    method: 'POST',
    body: JSON.stringify(notification),
  });
}

export async function notificationsFor(
  notifiableId: string | number,
  options: { unreadOnly?: boolean; limit?: number } = {},
): Promise<RemoteNotification[]> {
  const url = endpoint('api/v1/notifications');
  url.searchParams.set('notifiableId', String(notifiableId));
  url.searchParams.set('limit', String(options.limit ?? 50));
  if (options.unreadOnly) url.searchParams.set('unreadOnly', 'true');
  const data = responseData(await request(`${url.pathname}${url.search}`));
  if (!Array.isArray(data) || !data.every(isRemoteNotification)) {
    throw new Error('Notification service returned an invalid inbox.');
  }
  return data;
}

export async function unreadNotificationCount(notifiableId: string | number): Promise<number> {
  const url = endpoint('api/v1/notifications');
  url.searchParams.set('notifiableId', String(notifiableId));
  url.searchParams.set('countOnly', 'true');
  const data = responseData(await request(`${url.pathname}${url.search}`));
  if (data === null || typeof data !== 'object' || !('count' in data) || typeof data.count !== 'number') {
    throw new Error('Notification service returned an invalid unread count.');
  }
  return data.count;
}

export async function markNotificationRead(
  notificationId: string,
  notifiableId: string | number,
): Promise<void> {
  await request('api/v1/notifications', {
    method: 'PATCH',
    body: JSON.stringify({ notificationId, notifiableId: String(notifiableId) }),
  });
}

export async function markAllNotificationsRead(notifiableId: string | number): Promise<void> {
  await request('api/v1/notifications', {
    method: 'PATCH',
    body: JSON.stringify({ notifiableId: String(notifiableId) }),
  });
}

export async function deleteNotifications(notifiableId: string | number): Promise<void> {
  const url = endpoint('api/v1/notifications');
  url.searchParams.set('notifiableId', String(notifiableId));
  await request(`${url.pathname}${url.search}`, { method: 'DELETE' });
}

