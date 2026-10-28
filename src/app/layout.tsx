import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AvisoAlmacenamiento } from "@/components/ui/AvisoAlmacenamiento";
import { AvisoSinConexion } from "@/components/ui/AvisoSinConexion";
import { Nav } from "@/components/ui/Nav";
import { NavSesion } from "@/components/ui/NavSesion";
import { RegistroServiceWorker } from "@/components/ui/RegistroServiceWorker";
import { ProveedorToast } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nivela",
  description: "Evaluación de competencias entre pares",
  applicationName: "Nivela",
  // PWA (CLAUDE.md → PWA). app/manifest.ts adds the <link rel="manifest">.
  appleWebApp: { capable: true, title: "Nivela", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icono.svg", type: "image/svg+xml" },
      { url: "/icons/icono-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CR" className="antialiased">
      <body className="flex min-h-dvh flex-col">
        <ProveedorToast>
          <Nav>
            {/* Session-dependent, so it streams in after the static shell. */}
            <Suspense fallback={null}>
              <NavSesion />
            </Suspense>
          </Nav>
          <AvisoSinConexion />
          <AvisoAlmacenamiento />
          {children}
        </ProveedorToast>
        <RegistroServiceWorker />
      </body>
    </html>
  );
}
