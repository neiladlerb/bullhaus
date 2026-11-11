import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import "./globals.css";

const raleway = Raleway({ subsets: ["latin"], variable: "--font-raleway", display: "swap" });

export const metadata: Metadata = {
  title: "Bull Haus · Back office",
  description: "Gestión de propiedades, agentes y operaciones de Bull Haus Intermediación y Gestión Inmobiliaria",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL" className={raleway.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
