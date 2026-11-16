import assert from 'node:assert/strict';
import test from 'node:test';
import { Config } from '../src/lib/core/config/index.js';
import { NotificationManager } from '../src/lib/core/notifications/NotificationManager.js';
import { OtpNotification } from '../src/lib/core/notifications/messages/OtpNotification.js';
import { WelcomeNotification } from '../src/lib/core/notifications/messages/WelcomeNotification.js';

test('notification channels are forwarded to admin-2 with rendered email content', async () => {
  const previousFetch = globalThis.fetch;
  const requests: Array<{ url: string; headers: Headers; body: Record<string, unknown> }> = [];
  Config.set('notifications.serviceUrl', 'https://admin.test');
  Config.set('notifications.serviceApiKey', 'spk_test');
  globalThis.fetch = async (input, init) => {
    requests.push({
      url: String(input),
      headers: new Headers(init?.headers),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });
    return new Response(JSON.stringify({ data: { queued: false } }), { status: 200 });
  };

  try {
    await NotificationManager.sendNow(
      { id: 'account-1', email: 'ada@example.com' },
      new WelcomeNotification('Ada'),
    );
    await NotificationManager.sendNow(
      { id: 'account-1', email: 'ada@example.com', phone: '+2348012345678' },
      new OtpNotification('123456'),
    );

    assert.equal(requests.length, 2);
    assert.equal(requests[0]?.url, 'https://admin.test/api/v1/notifications');
    assert.equal(requests[0]?.headers.get('authorization'), 'Bearer spk_test');
    const welcome = requests[0]?.body;
    assert.equal(welcome?.['notifiableId'], 'account-1');
    assert.equal(welcome?.['queue'], false);
    const welcomeChannels = welcome?.['channels'] as Record<string, Record<string, unknown>>;
    assert.equal(welcomeChannels['database']?.['data'] !== undefined, true);
    assert.equal(welcomeChannels['mail']?.['to'], 'ada@example.com');
    assert.match(String(welcomeChannels['mail']?.['html']), /Welcome, Ada!/);

    const otp = requests[1]?.body;
    const otpChannels = otp?.['channels'] as Record<string, Record<string, unknown>>;
    assert.equal(otpChannels['mail']?.['priority'], 'high');
    assert.equal(otpChannels['sms']?.['to'], '+2348012345678');
    assert.match(String(otpChannels['sms']?.['message']), /123456/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
