import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("tokens de diseño (globals.css)", () => {
  it.each([
    ["--color-canvas", "#f5f5f7"],
    ["--color-ink", "#1d1d1f"],
    ["--color-primary", "#0071e3"],
    ["--color-link", "#0066cc"],
    ["--color-hairline", "#d6d6d6"],
    ["--color-wash", "#aad0f6"],
    ["--radius-pill", "980px"],
    ["--radius-tile", "12px"],
  ])("define %s: %s", (token, valor) => {
    expect(css).toContain(`${token}: ${valor};`);
  });

  it("usa la pila de fuentes del sistema, sin SF Pro", () => {
    expect(css).toMatch(/--font-sans: ui-sans-serif, system-ui/);
    expect(css).not.toMatch(/SF Pro/i);
  });

  it("es solo modo claro y sin sombras", () => {
    expect(css).not.toMatch(/prefers-color-scheme/);
    expect(css).not.toMatch(/box-shadow/);
  });
});
