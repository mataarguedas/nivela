import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

// Production guard for every script that writes to a database (db:migrate,
// db:seed, cuentas:prueba, cuentas:importar). A Neon host is
// `<endpoint>[-pooler].<region>.aws.neon.tech`; pooled and direct URLs share
// the endpoint id, so that is what gets compared.
//
// Production endpoints are read from `.env`, which holds Vercel's
// DATABASE_URL (Production) and DATABASE_URL_UNPOOLED, plus an optional
// comma-separated NIVELA_ENDPOINTS_PRODUCCION. No host is hard-coded in the
// repo. If none can be found the guard says so instead of passing silently.
// No dependencies, so drizzle.config.ts can import it too.

/** "ep-abc-123" from a postgres URL (the pooled or the direct host). */
export function endpointDe(url: string): string {
  const host = new URL(url).hostname;
  return host.split(".")[0].replace(/-pooler$/, "");
}

/** The host to print: never credentials. */
export function hostDe(url: string): string {
  return new URL(url).host;
}

export function endpointsProduccion(archivo = ".env"): Set<string> {
  const endpoints = new Set<string>();
  try {
    const env = parseEnv(readFileSync(archivo, "utf8"));
    for (const clave of ["DATABASE_URL", "DATABASE_URL_UNPOOLED"]) {
      const valor = env[clave];
      if (valor) endpoints.add(endpointDe(valor));
    }
  } catch {
    // No .env (CI, a fresh clone): only the explicit list below.
  }
  for (const valor of (process.env.NIVELA_ENDPOINTS_PRODUCCION ?? "").split(",")) {
    if (valor.trim()) endpoints.add(valor.trim());
  }
  return endpoints;
}

export function esProduccion(url: string, produccion = endpointsProduccion()): boolean {
  return produccion.has(endpointDe(url));
}

/**
 * Throws when `url` is production and `permitir` is false. With `permitir`
 * (the explicit --produccion flag) it only returns true, so the caller can
 * print it and ask for confirmation.
 */
export function exigirDestino(url: string, permitir: boolean, produccion = endpointsProduccion()): { produccion: boolean } {
  if (produccion.size === 0) {
    console.warn("Aviso: no se encontró el host de producción (.env); no se puede verificar el destino.");
  }
  const esProd = produccion.has(endpointDe(url));
  if (esProd && !permitir) {
    throw new Error(
      `Refusing to run: ${hostDe(url)} is the PRODUCTION database. Pass --produccion only if that is intended.`,
    );
  }
  return { produccion: esProd };
}
