import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { esProduccion, hostDe } from "./baseProduccion";

// Dev-only scripts (db:seed, cuentas:prueba) write fake data. Like `next
// dev`, they read `.env.local` first; `.env.local` is the Neon dev branch and
// `.env` is production (CLAUDE.md → Database). This refuses to go on unless
// DATABASE_URL is exactly the one in `.env.local`, never in production mode,
// and never when that URL's host is production (baseProduccion.ts): fake
// evaluations or accounts must never reach the real reports, so these
// scripts have no --produccion override. Returns the host to print.

export function cargarEntornoDesarrollo(): string {
  if (process.argv.includes("--produccion")) {
    throw new Error("Refusing to run: this script only writes fake data and never runs against production.");
  }
  for (const archivo of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(archivo);
    } catch {
      // File not present: fine.
    }
  }
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("Refusing to run: NODE_ENV or VERCEL_ENV is production.");
  }
  let local: string | undefined;
  try {
    local = parseEnv(readFileSync(".env.local", "utf8")).DATABASE_URL;
  } catch {
    local = undefined;
  }
  const url = process.env.DATABASE_URL;
  if (!url || !local || url !== local) {
    throw new Error("Refusing to run: DATABASE_URL must come from .env.local (the Neon dev branch).");
  }
  if (esProduccion(url)) {
    throw new Error(`Refusing to run: ${hostDe(url)} (from .env.local) is the PRODUCTION database.`);
  }
  return hostDe(url);
}
