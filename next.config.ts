import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Inlined at build time so src/config/participantes.ts gives the same list
  // on server and client. Not secret. The default lives in participantes.ts.
  env: {
    CANTIDAD_PARTICIPANTES: process.env.CANTIDAD_PARTICIPANTES ?? "",
  },
  partialPrefetching: true,
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
