import type { Readable } from 'node:stream';

export type Contents = string | Uint8Array | Readable;

export interface FileStat {
  size: number;
  /** ms since epoch */
  modifiedAt: number;
}

export interface DirectoryListing {
  /** Full paths from the disk root, e.g. 'avatars/ada.png' */
  files: string[];
  directories: string[];
}

/**
 * What a driver must implement (S3, etc.). Paths are already normalised by Disk:
 * forward slashes, no leading slash, no '..'. '' is the root.
 */
export interface StorageDriver {
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<Buffer>;
  readStream(path: string): Promise<Readable>;
  write(path: string, contents: Buffer | Readable): Promise<void>;
  append(path: string, contents: Buffer): Promise<void>;
  /** Returns whether a file was removed. */
  remove(path: string): Promise<boolean>;
  copy(from: string, to: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  stat(path: string): Promise<FileStat | undefined>;
  list(directory: string): Promise<DirectoryListing>;
  makeDirectory(path: string): Promise<void>;
  removeDirectory(path: string): Promise<void>;
  /** Only drivers backed by the local disk. */
  localPath?(path: string): string;
}
