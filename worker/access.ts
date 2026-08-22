import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AccessPayload, Env } from "./env";

let cachedJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

/**
 * Validates the Cloudflare Access JWT on the request.
 *
 * Defense-in-depth: Cloudflare Access sits in front of /admin* and /api/admin*
 * at the edge, but we also cryptographically verify the Cf-Access-Jwt-Assertion
 * header here so the API stays protected even if the Worker is reached directly.
 *
 * When ACCESS_AUD / ACCESS_TEAM_DOMAIN are unset (local dev), auth is skipped.
 */
export async function verifyAccess(env: Env, request: Request): Promise<AccessPayload | null> {
  if (!env.ACCESS_AUD || !env.ACCESS_TEAM_DOMAIN) {
    return { email: "dev@local" };
  }

  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return null;

  try {
    if (!cachedJWKS) {
      const url = new URL(`${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`);
      cachedJWKS = createRemoteJWKSet(url);
    }
    const { payload } = await jwtVerify(token, cachedJWKS, {
      issuer: env.ACCESS_TEAM_DOMAIN,
      audience: env.ACCESS_AUD,
    });
    return payload as AccessPayload;
  } catch {
    return null;
  }
}