// Lee la ficha pública de una propiedad en bullhaus.cl (sitio actual, Prop360) para
// cargarla en el back office. Solo toma lo que la ficha publicada dice: un campo que
// no aparece queda vacío. No lee las coordenadas del mapa: equivalen a la dirección
// exacta, que en el back office es privada.
import { parseChileanNumber } from "./format";
import type { Currency, Operation, PropertyStatus, PropertyType } from "./property";

export interface SiteOffer {
  operation: Operation;
  price: number;
  currency: Currency;
}

export interface SiteListing {
  code: string;
  offers: SiteOffer[];
  type: PropertyType;
  comuna: string;
  headline?: string;
  bedrooms?: number;
  bathrooms?: number;
  m2Useful?: number;
  m2Land?: number;
  description?: string;
  features: string[];
  details: Record<string, string>;
  photos: string[];
  brokerEmail?: string;
  status: PropertyStatus;
}

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", deg: "°", ordm: "º", ordf: "ª",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", uuml: "ü",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ", Uuml: "Ü",
  iexcl: "¡", iquest: "¿", sup2: "²", middot: "·", ndash: "–", mdash: "—", laquo: "«", raquo: "»",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return NAMED[e] ?? m;
  });
}

// Espacios especiales (no separables, finos) a espacio normal: son invisibles y algunas bases los rechazan.
const spaces = (s: string) => s.replace(/[   ​ ]/g, " ");
const clean = (s: string) => spaces(decodeEntities(s.replace(/<[^>]*>/g, ""))).replace(/\s+/g, " ").trim();

function between(html: string, start: string, end: string): string {
  const i = html.indexOf(start);
  if (i < 0) return "";
  const j = html.indexOf(end, i + start.length);
  return html.slice(i + start.length, j < 0 ? undefined : j);
}

const TYPES: [RegExp, PropertyType][] = [
  [/^departamento/i, "departamento"],
  [/^casa/i, "casa"],
  [/^oficina/i, "oficina"],
  [/^local/i, "local"],
  [/^(terreno|sitio|lote)/i, "terreno"],
  [/^parcela/i, "parcela"],
];

const STATUS: [RegExp, PropertyStatus][] = [
  [/arrendad/i, "arrendada"],
  [/vendid/i, "vendida"],
  [/reservad/i, "reservada"],
];

function num(s: string | undefined): number | undefined {
  if (s === undefined) return undefined;
  const n = parseChileanNumber(s);
  return n === null ? undefined : n;
}

export class SiteListingError extends Error {}

/** Interpreta el HTML de https://www.bullhaus.cl/<código>. */
export function parseSiteListing(html: string): SiteListing {
  const ficha = between(html, "module-ficha", "property-gallery");
  if (!ficha) throw new SiteListingError("La página no tiene una ficha de propiedad");

  const codeMatch = /Cod\.:\s*([\d.]+)/.exec(ficha);
  if (!codeMatch) throw new SiteListingError("La ficha no tiene código");
  const code = codeMatch[1]!.replace(/\./g, "");

  const ops = [...ficha.matchAll(/class='label label-sm[^']*'>\s*(Venta|Arriendo)\s*</gi)].map((m) =>
    m[1]!.toLowerCase() === "venta" ? "venta" : "arriendo",
  ) as Operation[];
  const prices = [...ficha.matchAll(/property__price-primary'>\s*([^<]+)</g)].map((m) => clean(m[1]!));
  const offers: SiteOffer[] = [];
  let foreign = false;
  let perM2 = false;
  ops.forEach((operation, i) => {
    const raw = prices[i];
    if (!raw) return;
    // El back office maneja UF y pesos, y no convierte monedas: un precio en dólares no se importa.
    if (/^(US\$|USD)/i.test(raw)) {
      foreign = true;
      return;
    }
    // Precio por m² (bodegas, oficinas): la ficha no da un total y no lo calculamos.
    if (/\/\s*m2|\/\s*m²/i.test(raw)) {
      perM2 = true;
      return;
    }
    const currency: Currency = /^UF/i.test(raw) ? "UF" : "CLP";
    const price = num(raw);
    if (price && price > 0) offers.push({ operation, price, currency });
  });
  if (offers.length === 0) {
    throw new SiteListingError(
      foreign
        ? `La ficha ${code} tiene precio en US$: cárgala a mano en UF o pesos`
        : perM2
          ? `La ficha ${code} tiene precio por m²: cárgala a mano con el precio total`
          : `La ficha ${code} no tiene operación ni precio`,
    );
  }

  const title = clean(/<h4>([^<]+ en [^<]+)<\/h4>/.exec(ficha)?.[1] ?? "");
  const [typeText = "", comuna = ""] = title.split(/ en (.+)/);
  const type = TYPES.find(([re]) => re.test(typeText))?.[1] ?? "otro";
  if (!comuna) throw new SiteListingError(`La ficha ${code} no indica la comuna`);

  const headline = clean(/<p class='property-address'>([\s\S]*?)<\/p>/.exec(ficha)?.[1] ?? "") || undefined;

  const specs = clean(ficha.slice(ficha.indexOf("property__list")));
  const bedrooms = num(/(\d+)\s*Dorm\./.exec(specs)?.[1]);
  const bathrooms = num(/(\d+)\s*Baños?/.exec(specs)?.[1]);
  const m2Useful = num(/(?:Útil|Const\.)\s*([\d.,]+)/.exec(specs)?.[1]);
  const m2Land = num(/Ter\.\s*([\d.,]+)/.exec(specs)?.[1]);

  const gallery = between(html, "property-gallery", "property-description");
  const ribbon = /ribbon[^']*'>\s*<span>([^<]+)<\/span>/.exec(gallery)?.[1] ?? "";
  const status = STATUS.find(([re]) => re.test(ribbon))?.[1] ?? "disponible";
  const photos = [...new Set([...gallery.matchAll(/data-fancybox='Property' href='(https:\/\/[^']+)'/g)].map((m) => m[1]!))];

  const descHtml = between(html, "property-description content'>", "<div class='tabs'>").replace(/<h4>[\s\S]*?<\/h4>/, "");
  const description =
    spaces(decodeEntities(descHtml.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "")))
      .split("\n")
      .map((l) => l.replace(/[ \t]+/g, " ").trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() || undefined;

  const featuresHtml = between(html, "<div id='tabs-1'", "<div id='tabs-2'");
  const features = [...featuresHtml.matchAll(/property__features-item'>([\s\S]*?)<\/li>/g)].map((m) => clean(m[1]!)).filter(Boolean);

  const detailsHtml = between(html, "<div id='tabs-2'", "</ul>");
  const details: Record<string, string> = {};
  for (const m of detailsHtml.matchAll(/details-item--cat'>([^<]+?):?<\/span>([^<]*)<\/li>/g)) {
    const value = clean(m[2]!);
    if (value) details[clean(m[1]!).replace(/:$/, "")] = value;
  }

  const brokerBlock = between(html, "<span>BROKER</span>", "</section>");
  const brokerEmail = /mailto:([^'"\s>]+@[^'"\s>]+)/.exec(brokerBlock)?.[1]?.toLowerCase();

  return { code, offers, type, comuna, headline, bedrooms, bathrooms, m2Useful, m2Land, description, features, details, photos, brokerEmail, status };
}

/** Códigos publicados en bullhaus.cl al 11/11/2026 (listados de venta y arriendo). */
export const SITE_CODES: readonly string[] = [
  "109986", "109985", "109984", "109983", "109981", "109978", "109977", "109976", "109975", "109974", "109973", "109972",
  "109969", "109968", "109967", "109966", "109964", "109960", "109959", "109958", "109957", "109956", "109952", "109951",
  "109950", "109946", "109945", "109944", "109943", "109940", "109939", "109938", "109937", "109935", "109926", "109924",
  "109920", "109916", "109913", "109912", "109911", "109901", "109898", "109897", "109895", "109890", "109882", "109881",
  "109878", "109877", "109872", "109860", "109859", "109856", "109855", "109846", "109841", "109838", "109834", "109822",
  "109821", "109807", "109796", "109772", "109767", "109758", "109751", "109739", "109704", "109696", "109690", "109685",
  "109659", "109628", "109626", "109618", "109616", "109602", "109581", "109568", "109564", "109559", "109533", "109530",
  "109525", "109517", "109516", "109505", "109496", "109491", "109490", "109486", "109484", "109483", "109442", "109425",
  "109416", "109398", "109394", "109371", "109352", "109310", "109297", "109291", "109283", "109276", "109271",
];

/** Código en el back office: la venta usa el código del sitio; el arriendo de una propiedad que también se vende, sufijo -A. */
export function backofficeCode(listing: Pick<SiteListing, "code" | "offers">, offer: SiteOffer): string {
  const both = listing.offers.some((o) => o.operation === "venta") && listing.offers.some((o) => o.operation === "arriendo");
  return both && offer.operation === "arriendo" ? `${listing.code}-A` : listing.code;
}
