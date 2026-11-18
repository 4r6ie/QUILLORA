/**
 * Repair accounts that exist in `auth.users` but have no `public.profiles` row.
 *
 * These orphans are the residue of the old fire-and-forget profile insert: the
 * auth user was created, the profile write failed, and nobody noticed. They can
 * still sign in but every guarded route treats them as a reader with no profile.
 *
 * Dry run (default):
 *   node --env-file=.env.local scripts/repair-profiles.mjs
 *
 * Apply:
 *   node --env-file=.env.local scripts/repair-profiles.mjs --apply
 *
 * Safe to re-run: inserts are skipped when the profile id already exists.
 */
import { loadEnv, withClient, log } from "./lib.mjs";

loadEnv();

const APPLY = process.argv.includes("--apply");

function usernameFromEmail(email) {
  const local = String(email ?? "").split("@")[0] ?? "";
  const base = local
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);

  if (!base) return "reader";
  return base.length < 3 ? `user_${base}` : base;
}

async function insertProfile(client, orphan) {
  const base = usernameFromEmail(orphan.email);

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const username = attempt === 0 ? base : `${base}_${attempt + 1}`;
    try {
      await client.query(
        `INSERT INTO public.profiles (id, email, username, full_name, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'author', $5, now())
         ON CONFLICT (id) DO NOTHING`,
        [orphan.id, orphan.email, username, null, orphan.created_at],
      );
      return username;
    } catch (error) {
      if (error?.code === "23505" && String(error.detail ?? "").includes("username")) {
        continue; // username taken: try the next suffix
      }
      throw error;
    }
  }

  throw new Error(`could not find a free username for ${orphan.email}`);
}

async function main() {
  await withClient(async (client) => {
    const { rows } = await client.query(`
      SELECT u.id, u.email, u.created_at
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      WHERE p.id IS NULL
      ORDER BY u.created_at
    `);

    if (rows.length === 0) {
      log("no orphan auth users found");
      return;
    }

    log(`found ${rows.length} auth user(s) without a profile`);
    for (const orphan of rows) {
      log(`  ${orphan.id}  ${orphan.email}`);
    }

    if (!APPLY) {
      log("dry run: re-run with --apply to create the missing profiles");
      return;
    }

    for (const orphan of rows) {
      const username = await insertProfile(client, orphan);
      log(`created profile ${orphan.id} as @${username}`);
    }

    log("done: run `npm run db:migrate`-free; no schema changes were made");
  });
}

main().catch((error) => {
  console.error("[quillora] repair failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
