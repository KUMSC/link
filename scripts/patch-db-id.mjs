/**
 * Ensures wrangler.jsonc has a real `database_id` for the D1 binding.
 *
 * When D1 is auto-provisioned (Deploy to Cloudflare button / GitHub
 * integration), the id may not be written back into the config, which breaks
 * `wrangler d1 migrations apply --remote` (it resolves DBs by id, not name).
 * This fetches the id from the account and patches the config in place.
 */
import { execSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(root, "wrangler.jsonc");
const DB_NAME = "link-db";

const list = JSON.parse(execSync("npx wrangler d1 list --json", { cwd: root, encoding: "utf8" }));
const db = list.find((d) => d.name === DB_NAME || d.database_name === DB_NAME);

if (!db) {
  console.error(`D1 database "${DB_NAME}" not found on this account. Create it with: wrangler d1 create ${DB_NAME}`);
  process.exit(1);
}

const id = db.uuid ?? db.database_id;
const raw = await readFile(CONFIG_PATH, "utf8");
const hasId = /"database_id"\s*:\s*"([0-9a-fA-F-]{36})"/.test(raw);

if (hasId) {
  console.log(`database_id already set for ${DB_NAME}.`);
  process.exit(0);
}

const patched = raw.replace(
  /("binding"\s*:\s*"DB"[\s\S]*?"database_name"\s*:\s*"[^"]*",?)(\s*\n?\s*)\}/,
  `$1$2"database_id": "${id}"\n  }`,
);

await writeFile(CONFIG_PATH, patched);
console.log(`Patched wrangler.jsonc with database_id ${id}`);