import type { NextConfig } from "next";

const desarrollo = process.env.NODE_ENV === "development";

// Content Security Policy (PRD §13 → Security). Everything is same-origin:
// the browser only ever talks to this app. TypeSafe (Jev) is called from
// src/lib/jev.ts on the server, so api.typesafe.ai is not in connect-src.
//
// Why 'unsafe-inline' in script-src instead of nonces: the app uses Cache
// Components (static shells prerendered at build time). A nonce must be
// fresh per request, so it can't be baked into a prerendered shell; Next's
// CSP guide notes nonces need every page dynamically rendered and are
// incompatible with partial prerendering. Next's inline scripts (the RSC
// payload, `self.__next_f.push(...)`) therefore need 'unsafe-inline'. The
// rest of the policy still blocks every third-party origin, plugins, framing,
// <base> hijacking and cross-origin form posts. React and Recharts set inline
// style attributes, hence 'unsafe-inline' in style-src.
//
// Dev only: React needs eval for its error overlay, and HMR uses a WebSocket.
// upgrade-insecure-requests only on Vercel: `next start` serves plain http.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${desarrollo ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${desarrollo ? " ws: wss:" : ""}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(process.env.VERCEL ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:ruta*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Legacy twin of frame-ancestors 'none' for older browsers.
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        // The browser must always revalidate the SW script so updates land.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
