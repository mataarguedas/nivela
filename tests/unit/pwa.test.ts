import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import manifest from "@/app/manifest";
import nextConfig from "../../next.config";

const raiz = process.cwd();

/** Width and height from a PNG's IHDR chunk. */
function dimensionesPng(ruta: string): [number, number] {
  const png = readFileSync(join(raiz, "public", ruta));
  expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

describe("manifest", () => {
  const m = manifest();

  it("cumple CLAUDE.md → PWA", () => {
    expect(m).toMatchObject({
      name: "Nivela",
      short_name: "Nivela",
      lang: "es-CR",
      display: "standalone",
      start_url: "/",
      background_color: "#f5f5f7",
      theme_color: "#ffffff",
    });
  });

  it("declara íconos 192, 512 y maskable que existen con ese tamaño", () => {
    const iconos = m.icons ?? [];
    expect(iconos.map((i) => `${i.sizes} ${i.purpose}`)).toEqual(["192x192 any", "512x512 any", "512x512 maskable"]);
    for (const icono of iconos) {
      const lado = Number(icono.sizes?.split("x")[0]);
      expect(dimensionesPng(icono.src)).toEqual([lado, lado]);
    }
  });

  it("incluye el apple-touch-icon de 180 px", () => {
    expect(dimensionesPng("/icons/apple-touch-icon.png")).toEqual([180, 180]);
  });
});

// Loads public/sw.js in a sandbox with a fake `self`, Cache Storage and
// network, and fires fetch events at it.
function cargarServiceWorker() {
  const oyentes = new Map<string, (evento: unknown) => void>();
  const self = {
    location: { origin: "https://nivela.example" },
    addEventListener: (tipo: string, oyente: (evento: unknown) => void) => oyentes.set(tipo, oyente),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };
  const guardadas = new Map<string, unknown>();
  const cache = {
    match: async (request: { url: string }) => guardadas.get(request.url),
    put: async (request: { url: string }, respuesta: unknown) => void guardadas.set(request.url, respuesta),
  };
  const caches = { open: async () => cache };
  const red = vi.fn(async () => {
    const respuesta = { ok: true, status: 200, type: "basic", clone: () => respuesta };
    return respuesta;
  });
  runInNewContext(readFileSync(join(raiz, "public", "sw.js"), "utf8"), { self, caches, fetch: red, URL });

  /** The SW's answer, or null when it lets the browser go to the network. */
  async function responde(url: string, method = "GET"): Promise<unknown> {
    let respuesta: Promise<unknown> | null = null;
    const pendientes: Promise<unknown>[] = [];
    oyentes.get("fetch")!({
      request: { url, method },
      respondWith: (p: Promise<unknown>) => (respuesta = p),
      waitUntil: (p: Promise<unknown>) => pendientes.push(p),
    });
    if (!respuesta) return null;
    const valor = await respuesta;
    await Promise.all(pendientes);
    return valor;
  }
  return { responde, red };
}

describe("service worker", () => {
  it("sirve /_next/static/* y /icons/* con cache-first", async () => {
    const { responde, red } = cargarServiceWorker();
    for (const url of ["https://nivela.example/_next/static/chunks/app.js", "https://nivela.example/icons/icono-192.png"]) {
      expect(await responde(url)).not.toBeNull();
      expect(await responde(url)).not.toBeNull();
    }
    expect(red).toHaveBeenCalledTimes(2); // the second request of each came from the cache
  });

  it.each([
    "https://nivela.example/api/jev",
    "https://nivela.example/api/evaluaciones?competencia=adaptabilidad&evaluador=x",
    "https://nivela.example/api/reportes/adaptabilidad/csv",
    "https://nivela.example/",
    "https://nivela.example/adaptabilidad/P01",
    "https://nivela.example/reportes/adaptabilidad",
    "https://nivela.example/manifest.webmanifest",
    "https://otro.example/_next/static/chunks/app.js",
  ])("nunca intercepta %s (solo red)", async (url) => {
    const { responde, red } = cargarServiceWorker();
    expect(await responde(url)).toBeNull();
    expect(red).not.toHaveBeenCalled();
  });

  it("no intercepta métodos distintos de GET", async () => {
    const { responde } = cargarServiceWorker();
    expect(await responde("https://nivela.example/_next/static/chunks/app.js", "POST")).toBeNull();
  });
});

describe("encabezados de seguridad", () => {
  async function encabezados(ruta: string): Promise<Record<string, string>> {
    const reglas = (await nextConfig.headers?.()) ?? [];
    const resultado: Record<string, string> = {};
    for (const regla of reglas) {
      const coincide = regla.source === "/:ruta*" || regla.source === ruta;
      if (coincide) for (const { key, value } of regla.headers) resultado[key] = value;
    }
    return resultado;
  }

  it("aplican CSP, nosniff, Referrer-Policy y Permissions-Policy a todo", async () => {
    const h = await encabezados("/");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["Permissions-Policy"]).toBe("camera=(), microphone=(), geolocation=()");
    const csp = h["Content-Security-Policy"];
    for (const directiva of [
      "default-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ]) {
      expect(csp).toContain(directiva);
    }
  });

  it("la CSP no permite orígenes externos (Jev se llama solo desde el servidor)", async () => {
    const csp = (await encabezados("/"))["Content-Security-Policy"];
    expect(csp).not.toMatch(/typesafe/i);
    expect(csp).not.toMatch(/https?:/);
    expect(csp).not.toContain("*");
  });

  it("sw.js se revalida siempre", async () => {
    expect((await encabezados("/sw.js"))["Cache-Control"]).toContain("no-cache");
  });
});
