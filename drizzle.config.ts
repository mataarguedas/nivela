import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { defineConfig } from "drizzle-kit";

// drizzle-kit (db:generate / db:migrate). Only DATABASE_URL, the same URL the
// app uses, so a migration lands on the database the app talks to (locally:
// the Neon dev branch).
//
// drizzle-kit loads `.env` into process.env on its own before reading this
// file, so process.loadEnvFile(".env.local") would NOT override it (it never
// replaces existing variables) and migrations would silently go to the URL in
// `.env`. Read `.env.local` explicitly and let it win, like `next dev` does.
// Without a .env.local (CI, Vercel) the environment's own value is used.
//
// DATABASE_URL_MIGRACION overrides both, for the one deliberate case of
// migrating production from this machine (README → Despliegue):
//   DATABASE_URL_MIGRACION="<production url>" npm run db:migrate
function desdeEnvLocal(clave: string): string | undefined {
  try {
    return parseEnv(readFileSync(".env.local", "utf8"))[clave];
  } catch {
    return undefined; // No .env.local: fine.
  }
}

const url = process.env.DATABASE_URL_MIGRACION ?? desdeEnvLocal("DATABASE_URL") ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");
console.log(`drizzle-kit → ${new URL(url).host}`);

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
