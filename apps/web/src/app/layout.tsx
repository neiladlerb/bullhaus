import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import { AttributionCapture } from "@/components/attribution";
import { CookieConsent } from "@/components/consent";
import { Footer, WhatsAppFloat } from "@/components/site";
import { UfCalculator } from "@/components/uf-calculator";
import { getUf } from "@/lib/uf";
import "./globals.css";

const raleway = Raleway({ subsets: ["latin"], variable: "--font-raleway", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "https://www.bullhaus.cl"),
  title: { default: "Bull Haus Propiedades · Venta, arriendo y asesoría inmobiliaria", template: "%s · Bull Haus Propiedades" },
  description:
    "Casas, departamentos y oficinas en venta y arriendo en el sector oriente de Santiago y en Zapallar, Papudo, Cachagua, Maitencillo y Viña del Mar.",
  openGraph: { siteName: "Bull Haus Propiedades", locale: "es_CL", type: "website" },
  icons: { icon: "/logo-bullhaus.png" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const uf = await getUf();
  return (
    <html lang="es-CL" className={raleway.variable}>
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
