import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { estadoCuenta, generarCodigo, hashCodigo, hashContrasena, verificarContrasena } from "@/lib/cuentas";

// Password hashing and verification codes (PRD §5.12). The flows that use
// the database are in cuentas-db.test.ts.

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", "secreto-de-prueba-con-al-menos-32-bytes!!");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("contraseñas (scrypt)", () => {
  it("verifica la contraseña correcta y rechaza otra", async () => {
    const hash = await hashContrasena("una clave larga");
    expect(hash).toMatch(/^scrypt\$32768\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    expect(hash).not.toContain("una clave larga");
    await expect(verificarContrasena("una clave larga", hash)).resolves.toBe(true);
    await expect(verificarContrasena("una clave largA", hash)).resolves.toBe(false);
    await expect(verificarContrasena("", hash)).resolves.toBe(false);
  });

  it("usa una sal distinta cada vez", async () => {
    const [a, b] = await Promise.all([hashContrasena("igual-igual"), hashContrasena("igual-igual")]);
    expect(a).not.toBe(b);
    await expect(verificarContrasena("igual-igual", a)).resolves.toBe(true);
    await expect(verificarContrasena("igual-igual", b)).resolves.toBe(true);
  });

  it("normaliza Unicode: la misma tilde escrita de dos formas es la misma contraseña", async () => {
    const hash = await hashContrasena("Psicología-2026");
    await expect(verificarContrasena("Psicología-2026", hash)).resolves.toBe(true);
  });

  it("un hash mal formado nunca verifica", async () => {
    for (const malo of ["", "scrypt$1$2$3", "bcrypt$a$b$c$d$e", "scrypt$x$8$1$AAAA$AAAA", "scrypt$32768$8$1$AAAA$"]) {
      await expect(verificarContrasena("lo-que-sea", malo)).resolves.toBe(false);
    }
  });
});

describe("códigos de verificación", () => {
  it("son 6 dígitos, con ceros a la izquierda", () => {
    const codigos = Array.from({ length: 200 }, generarCodigo);
    for (const c of codigos) expect(c).toMatch(/^\d{6}$/);
    expect(new Set(codigos).size).toBeGreaterThan(190);
  });

  it("se guardan como HMAC: nunca el código, distinto por cuenta y por secreto", () => {
    const hash = hashCodigo("ana", "123456");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("123456");
    expect(hashCodigo("ana", "123456")).toBe(hash);
    expect(hashCodigo("beto", "123456")).not.toBe(hash);
    vi.stubEnv("SESSION_SECRET", "otro-secreto-distinto-tambien-de-32-bytes");
    expect(hashCodigo("ana", "123456")).not.toBe(hash);
  });

  it("exige un SESSION_SECRET de al menos 32 bytes", () => {
    vi.stubEnv("SESSION_SECRET", "corto");
    expect(() => hashCodigo("ana", "123456")).toThrow(/32 bytes/);
  });
});

describe("estadoCuenta", () => {
  it("Sin correo / Pendiente de activar / Activa", () => {
    expect(estadoCuenta(undefined)).toBe("sin-correo");
    expect(estadoCuenta({ correo: null, contrasenaHash: null })).toBe("sin-correo");
    expect(estadoCuenta({ correo: "a@ejemplo.test", contrasenaHash: null })).toBe("pendiente");
    expect(estadoCuenta({ correo: "a@ejemplo.test", contrasenaHash: "scrypt$…" })).toBe("activa");
  });
});
