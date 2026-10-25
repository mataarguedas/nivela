import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AvisoAlmacenamiento } from "@/components/ui/AvisoAlmacenamiento";
import { Nav } from "@/components/ui/Nav";
import { NavSesion } from "@/components/ui/NavSesion";
import { ProveedorToast } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nivela",
  description: "Evaluación de competencias entre pares",
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
          <AvisoAlmacenamiento />
          {children}
        </ProveedorToast>
      </body>
    </html>
  );
}
