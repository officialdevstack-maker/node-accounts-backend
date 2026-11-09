import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { config } from '../lib/core/config/index.js';
import { Controller, type HttpRequest } from '../lib/core/controller/index.js';
import { Reply } from '../lib/core/response/index.js';
import { Activity } from '../models/Activity.js';
import type { User } from '../models/User.js';

const FILE_PATTERN = /^\d+-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$/;
const MIME_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
} as const;

const avatarDir = () => resolve(process.cwd(), config('storage.disks.public.root'), 'avatars');

function detectType(buffer: Buffer): keyof typeof MIME_TYPES | null {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

export async function removeFile(filename: string | null | undefined): Promise<void> {
  if (!filename || !FILE_PATTERN.test(filename)) return;

  try {
    await unlink(join(avatarDir(), filename));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return;
    throw error;
  }
}

class AvatarController extends Controller {
  async show(req: HttpRequest) {
    const filename = String(req.route('file') ?? '');
    const match = FILE_PATTERN.exec(filename);
    if (!match) this.abort(404, 'Not found.');

    try {
      const buffer = await readFile(join(avatarDir(), filename));
      const extension = match[1] as keyof typeof MIME_TYPES;
      return Reply.raw(buffer, MIME_TYPES[extension])
        .header('Cache-Control', 'public, max-age=31536000, immutable')
        .header('X-Content-Type-Options', 'nosniff');
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        this.abort(404, 'Not found.');
      }
      throw error;
    }
  }

  async update(req: HttpRequest) {
    const user = this.user<User>(req);
    const body: unknown = req.raw.body;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      this.abort(422, 'Send the image as PNG, JPEG or WebP.');
    }

    const extension = detectType(body);
    if (!extension) this.abort(422, 'Only PNG, JPEG or WebP images are allowed.');

    const filename = `${user.id}-${randomUUID()}.${extension}`;
    const path = join(avatarDir(), filename);
    await mkdir(avatarDir(), { recursive: true });
    await writeFile(path, body, { flag: 'wx' });

    const previous = user.avatar;
    try {
      user.forceFill({ avatar: filename });
      await user.save();
    } catch (error) {
      try {
        await removeFile(filename);
      } catch (cleanupError) {
        console.error('[avatar] could not remove upload after save failure', cleanupError);
      }
      throw error;
    }

    try {
      await removeFile(previous);
    } catch (error) {
      console.error('[avatar] could not remove replaced photo', error);
    }

    await Activity.record(user.id, 'avatar_updated', { ip: req.ip(), userAgent: req.userAgent() });
    return this.ok(user, 'Photo updated.');
  }

  async destroy(req: HttpRequest) {
    const user = this.user<User>(req);
    const previous = user.avatar;

    if (previous) {
      user.forceFill({ avatar: null });
      await user.save();
      try {
        await removeFile(previous);
      } catch (error) {
        console.error('[avatar] could not remove deleted photo', error);
      }
      await Activity.record(user.id, 'avatar_removed', { ip: req.ip(), userAgent: req.userAgent() });
    }

    return this.ok(user, 'Photo removed.');
  }
}

export const avatarController = new AvatarController();
