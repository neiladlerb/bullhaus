import type { Metadata, Viewport } from "next";
import { Raleway } from "next/font/google";
import { BULLHAUS_BRAND } from "@bullhaus/core";
import "./globals.css";

const raleway = Raleway({ subsets: ["latin"], variable: "--font-raleway", display: "swap" });

export const metadata: Metadata = {
  title: "Bull Haus · Back office",
  description: "Gestión de propiedades, agentes y operaciones de Bull Haus Intermediación y Gestión Inmobiliaria",
  // App instalable en el celular (manifest.ts). En iPhone, el ícono y el modo pantalla completa salen de aquí.
  appleWebApp: { capable: true, title: "Bull Haus", statusBarStyle: "default" },
  icons: { icon: "/iconos/icono-192.png", apple: "/iconos/icono-apple-180.png" },
};

export const viewport: Viewport = { themeColor: BULLHAUS_BRAND.colors.coal };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL" className={raleway.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
