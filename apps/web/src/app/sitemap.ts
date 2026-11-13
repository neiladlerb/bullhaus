import type { MetadataRoute } from "next";
import { comunaSlug } from "@bullhaus/core";
import { getProperties } from "@/lib/api";

export const revalidate = 300;

// Mapa del sitio para Google: páginas fijas, una por comuna con propiedades y una por ficha disponible.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.SITE_URL ?? "https://www.bullhaus.cl").replace(/\/+$/, "");
  const props = await getProperties();
  const comunas = [...new Set(props.map((p) => p.comuna))];
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/propiedades`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/vender`, changeFrequency: "monthly", priority: 0.9 },
    ...comunas.map((c) => ({ url: `${base}/comunas/${comunaSlug(c)}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...props.map((p) => ({ url: `${base}/propiedades/${p.code}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: `${base}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
