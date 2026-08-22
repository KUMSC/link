export interface Env {
  DB: D1Database;
  UPLOADS: R2Bucket;
  ASSETS: Fetcher;
  CACHE: KVNamespace;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
}

export interface AccessPayload {
  email?: string;
  [key: string]: unknown;
}