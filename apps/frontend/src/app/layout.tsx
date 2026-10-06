import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/magic/ThemeProvider";
import { CallProvider } from "@/components/videollamada/CallProvider";
import { SceneHost } from "@/components/magic/SceneHost";
import { CursorGlow } from "@/components/magic/CursorGlow";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./globals.css";

// Tipografía corporativa, autoalojada (@fontsource): Inter para titulares y cuerpo, JetBrains Mono
// para cifras. Sin peticiones a Google en build ni en runtime.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";

export const metadata: Metadata = {
  title: "GOZZ",
  description: "GOZZ — el CRM de marketing de Sandro Gozz",
  icons: { icon: "/favicon.svg" }
};

export const viewport: Viewport = { themeColor: "#0b1120", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {/* Grano de película de la landing: fijo, sin interacción, mezcla overlay. */}
        <SceneHost />
        <CursorGlow />
        <div className="grain-overlay" aria-hidden="true" />
        <ThemeProvider>
          {/* Sin Lenis (smooth scroll): su bucle rAF + re-escaneo de contenedores cada 250 ms bloqueaba
              el hilo principal en un CRM con listas en tiempo real. Scroll nativo del navegador. */}
          <CallProvider>
            {children}
          </CallProvider>
        </ThemeProvider>
        <Toaster position="top-right" theme="dark" closeButton />
      </body>
    </html>
  );
}
