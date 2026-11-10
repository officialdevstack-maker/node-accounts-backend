/** Where cached values live. Values are already JSON strings; the Cache facade does the (de)serializing. */
export interface CacheStore {
  get(key: string): Promise<string | undefined>;
  put(key: string, value: string, ttlSeconds: number): Promise<void>;
  forget(key: string): Promise<void>;
  /** Remove everything under this app's prefix. */
  flush(): Promise<void>;
}
