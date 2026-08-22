export interface Env {
  DB: D1Database;
  UPLOADS: R2Bucket;
  ASSETS: Fetcher;
  /** Optional: enables KV caching of the public payload when configured. */
  CACHE?: KVNamespace;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
}

export interface AccessPayload {
  email?: string;
  [key: string]: unknown;
}