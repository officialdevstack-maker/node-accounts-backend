// mail/views/layout.ts
// Reusable email layout + components (like Laravel's mail::layout / x-mail::button).
import mailConfig from '../config.js';

export const e = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const paragraph = (text: string): string =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#374151;">${text}</p>`;

export const button = (url: string, label: string): string => `
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
    <tr>
      <td style="background:#4f46e5;border-radius:8px;">
        <a href="${e(url)}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${e(label)}</a>
      </td>
    </tr>
  </table>`;

export const codeBox = (code: string): string => `
  <div style="margin:24px 0;padding:16px;text-align:center;background:#f3f4f6;border-radius:8px;font-size:32px;letter-spacing:8px;font-weight:700;color:#111827;">
    ${e(code)}
  </div>`;

export interface LayoutOptions {
  title: string;
  body: string;
  preheader?: string;
}

export function layout({ title, body, preheader = '' }: LayoutOptions): string {
  const { name, url, supportEmail } = mailConfig.app;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${e(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${e(preheader)}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
          <tr>
            <td style="padding:0 0 16px;text-align:center;">
              <a href="${e(url)}" style="font-size:22px;font-weight:700;color:#111827;text-decoration:none;">${e(name)}</a>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
              <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${e(title)}</h1>
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:16px;text-align:center;font-size:12px;color:#9ca3af;">
              &copy; ${new Date().getFullYear()} ${e(name)}. Need help? <a href="mailto:${e(supportEmail)}" style="color:#6b7280;">${e(supportEmail)}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
