import type { MetadataRoute } from "next";
import { getBrand } from "@/lib/api";

export const revalidate = 300;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = (process.env.SITE_URL ?? (await getBrand()).siteUrl).replace(/\/+$/, "");
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${base}/sitemap.xml`, host: base };
}
