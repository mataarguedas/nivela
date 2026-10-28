import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { crc32, deflateSync } from "node:zlib";

// Generates the PWA icons in public/icons/: a geometric "N" monogram in
// Obsidian (#1d1d1f) on Fog White (#f5f5f7). Original mark, no fonts, no
// dependencies: the glyph is three polygons rasterized with 4×4 supersampling
// and written as RGB PNGs. Run once after changing the design:
//   npx tsx scripts/generar-iconos.ts

const FONDO = [0xf5, 0xf5, 0xf7] as const;
const TINTA = [0x1d, 0x1d, 0x1f] as const;
const MUESTRAS = 4;

type Punto = readonly [number, number];
type Poligono = readonly Punto[];

/** The "N" in a glyph box of `alto` × 0.82·`alto`, centered on a `lado` canvas. */
function monograma(lado: number, alto: number): Poligono[] {
  const ancho = alto * 0.82;
  const trazo = alto * 0.17;
  const x0 = (lado - ancho) / 2;
  const y0 = (lado - alto) / 2;
  const x1 = x0 + ancho;
  const y1 = y0 + alto;
  // The diagonal is a parallelogram; its horizontal width is a bit larger
  // than the stems so its perpendicular weight looks the same.
  const diagonal = trazo * 1.2;
  return [
    [[x0, y0], [x0 + trazo, y0], [x0 + trazo, y1], [x0, y1]],
    [[x1 - trazo, y0], [x1, y0], [x1, y1], [x1 - trazo, y1]],
    [[x0, y0], [x0 + diagonal, y0], [x1, y1], [x1 - diagonal, y1]],
  ];
}

function dentro([x, y]: Punto, poligono: Poligono): boolean {
  let adentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i];
    const [xj, yj] = poligono[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) adentro = !adentro;
  }
  return adentro;
}

function rasterizar(lado: number, poligonos: Poligono[]): Buffer {
  const fila = 1 + lado * 3; // filter byte + RGB
  const datos = Buffer.alloc(fila * lado);
  for (let y = 0; y < lado; y++) {
    datos[y * fila] = 0;
    for (let x = 0; x < lado; x++) {
      let cubiertas = 0;
      for (let sy = 0; sy < MUESTRAS; sy++) {
        for (let sx = 0; sx < MUESTRAS; sx++) {
          const p: Punto = [x + (sx + 0.5) / MUESTRAS, y + (sy + 0.5) / MUESTRAS];
          if (poligonos.some((poligono) => dentro(p, poligono))) cubiertas++;
        }
      }
      const a = cubiertas / (MUESTRAS * MUESTRAS);
      const i = y * fila + 1 + x * 3;
      for (let c = 0; c < 3; c++) datos[i + c] = Math.round(FONDO[c] * (1 - a) + TINTA[c] * a);
    }
  }
  return datos;
}

function bloque(tipo: string, contenido: Buffer): Buffer {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(contenido.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, "ascii"), contenido]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
}

function png(lado: number, poligonos: Poligono[]): Buffer {
  const cabecera = Buffer.alloc(13);
  cabecera.writeUInt32BE(lado, 0);
  cabecera.writeUInt32BE(lado, 4);
  cabecera[8] = 8; // bit depth
  cabecera[9] = 2; // RGB, no alpha: iOS fills transparency with black
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloque("IHDR", cabecera),
    bloque("IDAT", deflateSync(rasterizar(lado, poligonos), { level: 9 })),
    bloque("IEND", Buffer.alloc(0)),
  ]);
}

function svg(): string {
  const lado = 64;
  const trazos = monograma(lado, lado * 0.5)
    .map((p) => `<path d="M${p.map(([x, y]) => `${+x.toFixed(2)} ${+y.toFixed(2)}`).join("L")}Z"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}"><rect width="${lado}" height="${lado}" rx="14" fill="#f5f5f7"/><g fill="#1d1d1f">${trazos}</g></svg>\n`;
}

// "any" icons fill half the canvas; the maskable one keeps the glyph well
// inside the 80 % safe circle, since launchers crop it to any shape.
const ICONOS = [
  { archivo: "icono-192.png", lado: 192, proporcion: 0.5 },
  { archivo: "icono-512.png", lado: 512, proporcion: 0.5 },
  { archivo: "icono-maskable-512.png", lado: 512, proporcion: 0.4 },
  { archivo: "apple-touch-icon.png", lado: 180, proporcion: 0.5 },
];

const destino = join(process.cwd(), "public", "icons");
mkdirSync(destino, { recursive: true });
for (const { archivo, lado, proporcion } of ICONOS) {
  writeFileSync(join(destino, archivo), png(lado, monograma(lado, lado * proporcion)));
  console.log(`public/icons/${archivo} (${lado}×${lado})`);
}
writeFileSync(join(destino, "icono.svg"), svg());
console.log("public/icons/icono.svg");
