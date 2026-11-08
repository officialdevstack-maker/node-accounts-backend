// config/storage.ts  (Laravel: config/filesystems.php)
import { env } from './env.js';

export const storageConfig = {
  /** Disk used by the Storage facade */
  default: env.oneOf('FILESYSTEM_DISK', ['local', 'public'] as const, 'local'),

  /** Where signed temporary URLs point. Must be the full path of the route that serves files (see usage). */
  signedPath: env.string('STORAGE_SIGNED_PATH', '/api/files'),

  disks: {
    /** Private files. Never served directly, use temporaryUrl() or a controller. */
    local: {
      root: env.string('STORAGE_LOCAL_ROOT', 'storage/app'),
      url: env.string('STORAGE_LOCAL_URL'),
    },
    /** Files that anyone may open by URL (serve the folder with express.static, see usage). */
    public: {
      root: env.string('STORAGE_PUBLIC_ROOT', 'storage/app/public'),
      url: env.string('STORAGE_PUBLIC_URL', `${env.string('APP_URL', 'http://localhost:3000')}/storage`),
    },
  },
};
