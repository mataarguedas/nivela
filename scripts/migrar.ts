// npm run db:migrate [-- --produccion]
//
// Runs `drizzle-kit migrate` (drizzle.config.ts picks the URL: the one in
// DATABASE_URL_MIGRACION, else .env.local's, else the environment's). The
// config refuses a production host unless this wrapper was given
// --produccion, which it passes on as NIVELA_PERMITIR_PRODUCCION=1. drizzle-kit
// can exit 1 with no clear message (e.g. a rejected password), so the exit
// code is passed through: check it.

import { spawnSync } from "node:child_process";

const permitir = process.argv.includes("--produccion");
const resultado = spawnSync("npx drizzle-kit migrate", {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NIVELA_PERMITIR_PRODUCCION: permitir ? "1" : "" },
});
if (resultado.status !== 0) console.error(`drizzle-kit migrate terminó con código ${resultado.status ?? "?"}.`);
process.exit(resultado.status ?? 1);
