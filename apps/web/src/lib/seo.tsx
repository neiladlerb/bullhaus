import { TYPE_LABELS, type Brand } from "@bullhaus/core";
import { photoUrl, type PublicProperty } from "@/lib/api";

// Datos estructurados (schema.org en JSON-LD) para que Google entienda quién es la corredora y qué
// es cada ficha. Solo datos que ya se muestran en la página; nunca la dirección exacta de la propiedad.

/** UF tiene código ISO 4217 propio: CLF. */
const iso = (c: PublicProperty["currency"]) => (c === "UF" ? "CLF" : "CLP");

export function JsonLd({ data }: { data: object }) {
  // "<" escapado para que un texto de la ficha no pueda cerrar la etiqueta <script>.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function agencyJsonLd(brand: Brand) {
  const sameAs = [brand.social.instagram?.url, brand.social.facebook?.url, brand.social.linkedin?.url].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: brand.name,
    legalName: brand.legalName,
    url: brand.siteUrl,
    description: brand.description,
    ...(brand.logo.imageUrl || brand.logo.iconUrl ? { logo: new URL(brand.logo.imageUrl ?? brand.logo.iconUrl!, brand.siteUrl).toString() } : {}),
    ...(brand.contact.whatsapp ? { telephone: brand.contact.whatsapp } : {}),
    ...(brand.contact.email ? { email: brand.contact.email } : {}),
    ...(brand.contact.office ? { address: { "@type": "PostalAddress", streetAddress: brand.contact.office, addressCountry: "CL" } } : {}),
    areaServed: brand.zones.map((z) => z.name),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function listingJsonLd(p: PublicProperty, brand: Brand, url: string) {
  const name = p.headline ?? `${TYPE_LABELS[p.type]} en ${p.operation} en ${p.comuna}`;
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name,
    url,
    ...(p.description ? { description: p.description.slice(0, 500) } : {}),
    image: p.photos.slice(0, 6).map((ph) => photoUrl(ph.lg)),
    offers: {
      "@type": "Offer",
      price: p.price,
      priceCurrency: iso(p.currency),
      businessFunction: p.operation === "arriendo" ? "http://purl.org/goodrelations/v1#LeaseOut" : "http://purl.org/goodrelations/v1#Sell",
      availability: "https://schema.org/InStock",
      seller: { "@type": "RealEstateAgent", name: brand.name, url: brand.siteUrl },
    },
    about: {
      "@type": p.type === "casa" ? "SingleFamilyResidence" : p.type === "departamento" ? "Apartment" : "Accommodation",
      address: { "@type": "PostalAddress", addressLocality: p.comuna, addressCountry: "CL" },
      ...(p.bedrooms ? { numberOfRooms: p.bedrooms } : {}),
      ...(p.bathrooms ? { numberOfBathroomsTotal: p.bathrooms } : {}),
      ...(p.m2Useful ? { floorSize: { "@type": "QuantitativeValue", value: p.m2Useful, unitCode: "MTK" } } : {}),
    },
  };
}

export function breadcrumbJsonLd(base: string, items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${base}${it.path}` })),
  };
}
