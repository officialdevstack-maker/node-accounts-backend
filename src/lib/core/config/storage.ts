// config/storage.ts  (Laravel: config/filesystems.php)
import { env } from './env.js';

const isProd = env.string('NODE_ENV') === 'production';
const driver = env.oneOf('AVATAR_STORAGE_DRIVER', ['local', 's3'] as const, isProd ? 's3' : 'local');
const bucket = env.string('S3_BUCKET');
const accessKeyId = env.string('S3_ACCESS_KEY_ID');
const secretAccessKey = env.string('S3_SECRET_ACCESS_KEY');

if (isProd && driver !== 's3') {
  throw new Error('AVATAR_STORAGE_DRIVER must be "s3" in production.');
}
if (driver === 's3' && (!bucket || !accessKeyId || !secretAccessKey)) {
  throw new Error('S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required for S3 avatar storage.');
}

export const storageConfig = {
  avatarDriver: driver,
  s3: {
    endpoint: env.string('S3_ENDPOINT') || undefined,
    region: env.string('S3_REGION', 'auto'),
    bucket,
    accessKeyId,
    secretAccessKey,
  },
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
