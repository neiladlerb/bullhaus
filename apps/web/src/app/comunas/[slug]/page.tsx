import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { comunaSlug } from "@bullhaus/core";
import { Header, PropertyCard } from "@/components/site";
import { getBrand, getProperties, type PublicProperty } from "@/lib/api";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

// Una página por comuna con propiedades disponibles (diagnóstico, oportunidad 2). Solo cifras que
// salen de las fichas: cuántas hay en venta y en arriendo. Nada de precios promedio ni promesas.
async function byComuna(slug: string): Promise<{ comuna: string; list: PublicProperty[] } | null> {
  const list = (await getProperties()).filter((p) => comunaSlug(p.comuna) === slug);
  return list.length ? { comuna: list[0]!.comuna, list } : null;
}

export async function generateStaticParams() {
  return [...new Set((await getProperties()).map((p) => comunaSlug(p.comuna)))].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const slug = (await params).slug;
  const [data, brand] = await Promise.all([byComuna(slug), getBrand()]);
  if (!data) return { title: "Comuna sin propiedades disponibles", robots: { index: false } };
  const title = `Propiedades en venta y arriendo en ${data.comuna}`;
  const description = `${data.list.length} ${data.list.length === 1 ? "propiedad disponible" : "propiedades disponibles"} en ${data.comuna} con ${brand.name}. Agenda una visita o pide la tasación de tu propiedad.`;
  return { title, description, alternates: { canonical: `/comunas/${slug}` }, openGraph: { title, description } };
}

export default async function ComunaPage({ params }: Params) {
  const slug = (await params).slug;
  const [data, brand] = await Promise.all([byComuna(slug), getBrand()]);
  if (!data) notFound();
  const { comuna, list } = data;
  const venta = list.filter((p) => p.operation === "venta").length;
  const arriendo = list.length - venta;
  const parts = [venta ? `${venta} en venta` : null, arriendo ? `${arriendo} en arriendo` : null].filter(Boolean).join(" y ");

  return (
    <>
      <JsonLd data={breadcrumbJsonLd((process.env.SITE_URL ?? brand.siteUrl).replace(/\/+$/, ""), [{ name: "Inicio", path: "/" }, { name: "Propiedades", path: "/propiedades" }, { name: comuna, path: `/comunas/${slug}` }])} />
      <Header />
      <main className="wrap py-10">
        <h1 className="text-3xl font-light md:text-4xl">Propiedades en venta y arriendo en {comuna}</h1>
        <p className="mt-2 text-muted">
          Hoy tenemos {parts} en {comuna}.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <PropertyCard key={p.code} p={p} />
          ))}
        </div>
        <section className="mt-12 rounded-2xl bg-sand p-8">
          <h2 className="text-2xl font-light">¿Tienes una propiedad en {comuna}?</h2>
          <p className="mt-2 text-muted">Te ayudamos a venderla o arrendarla. Un corredor te contacta para coordinar la tasación.</p>
          <Link href="/vender" className="btn-brand mt-5">
            Vende o arrienda con nosotros
          </Link>
        </section>
      </main>
    </>
  );
}
