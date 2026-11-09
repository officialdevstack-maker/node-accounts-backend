import type { Response } from 'express';
import { notifyBackchannelLogout } from './backchannel-logout.js';

export function notifyBackchannelLogoutAfterResponse(res: Response, userId: number): void {
  let started = false;
  const notify = () => {
    if (started) return;
    started = true;
    void notifyBackchannelLogout(userId).catch((error: unknown) => {
      console.error('Back-channel logout notification failed.', error);
    });
  };

  res.once('finish', notify);
  res.once('close', notify);
}
