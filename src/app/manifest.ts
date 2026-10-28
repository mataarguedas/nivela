import type { MetadataRoute } from "next";
import { TEXTOS } from "@/config/textos";

// PWA manifest (CLAUDE.md → PWA, PRD §13). Served at /manifest.webmanifest,
// which proxy.ts lets through without a session so browsers can read it.
// Icons come from scripts/generar-iconos.ts.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: TEXTOS.app.nombre,
    short_name: TEXTOS.app.nombre,
    description: TEXTOS.app.lema,
    lang: "es-CR",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f5f7",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
