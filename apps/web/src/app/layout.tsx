import type { Metadata } from "next";
import { brandCssVars } from "@bullhaus/core";
import { Raleway } from "next/font/google";
import { AttributionCapture } from "@/components/attribution";
import { CookieConsent } from "@/components/consent";
import { Footer, WhatsAppFloat } from "@/components/site";
import { UfCalculator } from "@/components/uf-calculator";
import { getBrand } from "@/lib/api";
import { getUf } from "@/lib/uf";
import "./globals.css";

const raleway = Raleway({ subsets: ["latin"], variable: "--font-raleway", display: "swap" });

// Título, descripción, ícono y colores salen de la ficha de marca de la corredora.
export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return {
    metadataBase: new URL(process.env.SITE_URL ?? brand.siteUrl),
    title: { default: `${brand.name} · ${brand.texts.heroEyebrow}`, template: `%s · ${brand.name}` },
    description: brand.description,
    openGraph: { siteName: brand.name, locale: "es_CL", type: "website" },
    ...(brand.logo.iconUrl ? { icons: { icon: brand.logo.iconUrl } } : {}),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [uf, brand] = await Promise.all([getUf(), getBrand()]);
  return (
    <html lang="es-CL" className={raleway.variable} style={brandCssVars(brand) as React.CSSProperties}>
      <body className="min-h-screen font-sans antialiased">
        {children}
        <Footer />
        <WhatsAppFloat />
        <UfCalculator uf={uf} />
        <AttributionCapture />
        <CookieConsent metaPixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID} gaId={process.env.NEXT_PUBLIC_GA4_ID} />
      </body>
    </html>
  );
}
