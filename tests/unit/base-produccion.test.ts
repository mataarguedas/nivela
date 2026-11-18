import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { endpointDe, endpointsProduccion, esProduccion, exigirDestino } from "../../scripts/baseProduccion";

// The production guard for db:migrate, db:seed, cuentas:prueba and
// cuentas:importar. Fake hosts only.

const PROD = "postgresql://u:p@ep-prod-123-pooler.c-1.us-east-1.aws.neon.tech/neondb?sslmode=require";
const PROD_DIRECTA = "postgresql://u:p@ep-prod-123.c-1.us-east-1.aws.neon.tech/neondb";
const DEV = "postgresql://u:p@ep-dev-456-pooler.c-2.us-east-2.aws.neon.tech/neondb";

function envDeProduccion(): string {
  const carpeta = mkdtempSync(join(tmpdir(), "nivela-"));
  const archivo = join(carpeta, ".env");
  writeFileSync(archivo, `DATABASE_URL="${PROD}"\nDATABASE_URL_UNPOOLED="${PROD_DIRECTA}"\n`);
  return archivo;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("guardia de producción", () => {
  it("compara el endpoint, sea la URL con pooler o directa", () => {
    expect(endpointDe(PROD)).toBe("ep-prod-123");
    expect(endpointDe(PROD_DIRECTA)).toBe("ep-prod-123");
    const produccion = endpointsProduccion(envDeProduccion());
    expect([...produccion]).toEqual(["ep-prod-123"]);
    expect(esProduccion(PROD_DIRECTA, produccion)).toBe(true);
    expect(esProduccion(DEV, produccion)).toBe(false);
  });

  it("rechaza producción sin --produccion y la permite con él", () => {
    const produccion = endpointsProduccion(envDeProduccion());
    expect(() => exigirDestino(PROD, false, produccion)).toThrow(/PRODUCTION/);
    expect(exigirDestino(PROD, true, produccion)).toEqual({ produccion: true });
    expect(exigirDestino(DEV, false, produccion)).toEqual({ produccion: false });
  });

  it("también acepta endpoints de NIVELA_ENDPOINTS_PRODUCCION y avisa si no conoce ninguno", () => {
    vi.stubEnv("NIVELA_ENDPOINTS_PRODUCCION", "ep-otro-789, ep-mas-000");
    expect(endpointsProduccion("no-existe/.env")).toEqual(new Set(["ep-otro-789", "ep-mas-000"]));
    vi.stubEnv("NIVELA_ENDPOINTS_PRODUCCION", "");
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(exigirDestino(DEV, false, endpointsProduccion("no-existe/.env"))).toEqual({ produccion: false });
    expect(aviso).toHaveBeenCalled();
  });
});
