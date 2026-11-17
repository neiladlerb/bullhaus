// Dictado del corredor: recorre la casa, cuenta cómo es y el sistema propone los datos de la ficha. Reglas
// (CLAUDE.md y docs/sistema-ia.md, paso 2):
// - Si el corredor no lo dijo, el campo queda vacío. Cada dato propuesto guarda la frase de la que salió, y una
//   propuesta cuya frase no está en el dictado se descarta (así el modelo no puede inventar).
// - El corredor confirma campo por campo antes de que algo llegue a la ficha.
// - La descripción se genera desde la ficha ya revisada, nunca desde el dictado. Si trae una cifra que no está en
//   la ficha, no se acepta.

import { z } from "zod";

export const DICTATION_FIELDS = {
  bedrooms: { label: "Dormitorios", kind: "int" },
  bathrooms: { label: "Baños", kind: "int" },
  parking: { label: "Estacionamientos", kind: "int" },
  storage: { label: "Bodegas", kind: "int" },
  m2Useful: { label: "Superficie útil (m²)", kind: "number" },
  m2Land: { label: "Terreno (m²)", kind: "number" },
  commonExpensesClp: { label: "Gastos comunes ($)", kind: "int" },
  pets: { label: "Mascotas", kind: "pets" },
  furnished: { label: "Amoblado", kind: "bool" },
  features: { label: "Características", kind: "list" },
  orientation: { label: "Orientación", kind: "detail" },
  floor: { label: "Piso", kind: "detail" },
  yearBuilt: { label: "Año de construcción", kind: "detail" },
} as const;

export type DictationFieldKey = keyof typeof DICTATION_FIELDS;
export const DICTATION_KEYS = Object.keys(DICTATION_FIELDS) as DictationFieldKey[];

/** Nombre con que cada dato de detalle se guarda en `details` de la ficha (y se muestra en la web). */
export const DETAIL_LABELS: Partial<Record<DictationFieldKey, string>> = {
  orientation: "Orientación",
  floor: "Piso",
  yearBuilt: "Año de construcción",
};

export type FieldValue = number | boolean | string | string[];

export interface ExtractedField {
  key: DictationFieldKey;
  value: FieldValue;
  /** Frase del dictado de donde salió, tal como se dijo. */
  source: string;
}

// ---------------------------------------------------------------------------------------------------------
// Reglas: funcionan sin modelo (gratis) y sirven de respaldo. Entienden números en palabra y lenguaje de terreno
// ("3 piezas", "dos bañitos", "est", "gc").

const WORD_NUM: Record<string, number> = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };
const NUM = String.raw`(\d{1,2}|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)`;
const toNum = (s: string) => WORD_NUM[s.toLowerCase()] ?? Number(s);

/** "1.250,5" o "1250" o "180 mil" a número. */
function parseAmount(raw: string, thousands?: string): number | null {
  const s = raw.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return thousands ? n * 1000 : n;
}

/** Divide el dictado en frases para guardar de dónde salió cada dato. */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const FEATURES: [RegExp, string][] = [
  [/\bpiscina\b/i, "Piscina"],
  [/\bquincho\b/i, "Quincho"],
  [/\bterraza\b/i, "Terraza"],
  [/\bjard[ií]n\b/i, "Jardín"],
  [/\blogia\b/i, "Logia"],
  [/\bbalc[oó]n\b/i, "Balcón"],
  [/calefacci[oó]n central/i, "Calefacción central"],
  [/\bloza radiante|losa radiante\b/i, "Losa radiante"],
  [/aire acondicionado/i, "Aire acondicionado"],
  [/\bgimnasio\b/i, "Gimnasio"],
  [/\bconserjer[ií]a\b|\bconserje\b/i, "Conserjería"],
  [/\bwalk[- ]?in\b/i, "Walk-in closet"],
  [/\bcocina (americana|abierta)\b/i, "Cocina americana"],
  [/\bisla\b/i, "Cocina con isla"],
  [/\bsala de estar\b|\bestar familiar\b/i, "Sala de estar"],
  [/\bescritorio\b|\bhome office\b/i, "Escritorio"],
  [/\bpieza de servicio\b|\bdormitorio de servicio\b/i, "Dormitorio de servicio"],
  [/\bvista (despejada|panor[aá]mica|a la cordillera|al mar)\b/i, "Vista despejada"],
  [/\bpanel(es)? solar(es)?\b/i, "Paneles solares"],
  [/\bjacuzzi\b|\btina de hidromasaje\b/i, "Jacuzzi"],
  [/\bchimenea\b|\bsalamandra\b/i, "Chimenea"],
  [/\bdoble vidrio|termopanel\b/i, "Ventanas termopanel"],
  [/\bsala de juegos\b/i, "Sala de juegos"],
  [/\bsal[oó]n de eventos\b|\bquincho com[uú]n\b/i, "Áreas comunes"],
];

const NEGATION = /\b(no tiene|sin|no hay|no cuenta con|le falta)\b/i;

export function extractByRules(text: string): ExtractedField[] {
  const out = new Map<DictationFieldKey, ExtractedField>();
  const features: { value: string; source: string }[] = [];
  const set = (key: DictationFieldKey, value: FieldValue, source: string) => {
    if (!out.has(key)) out.set(key, { key, value, source });
  };

  for (const s of sentences(text)) {
    let m: RegExpExecArray | null;
    if ((m = new RegExp(String.raw`\b${NUM}\s+(dormitorios?|piezas?|habitaciones?|dormis?)\b`, "i").exec(s))) set("bedrooms", toNum(m[1]!), s);
    if ((m = new RegExp(String.raw`\b${NUM}\s+(baños?|bañitos?)\b`, "i").exec(s))) set("bathrooms", toNum(m[1]!), s);
    if ((m = new RegExp(String.raw`\b${NUM}\s+(estacionamientos?|estac\.?|est\.?)(?=\s|,|\.|$)`, "i").exec(s))) set("parking", toNum(m[1]!), s);
    if ((m = new RegExp(String.raw`\b${NUM}\s+bodegas?\b`, "i").exec(s))) set("storage", toNum(m[1]!), s);
    else if (/\b(con|tiene|incluye)\s+bodega\b/i.test(s) && !NEGATION.test(s)) set("storage", 1, s);

    // Superficies: "120 metros", "120 m2", "800 metros de terreno", "terreno de 800 m²".
    // Lo que sigue se mira con lookahead (sin consumirlo) y solo hasta la siguiente cifra: "220 metros
    // construidos y 800 metros de terreno" son dos superficies distintas.
    const area = /(\d[\d.,]*)\s*(m2|m²|mts2?|metros cuadrados|metros)(?![a-záéíóú])(?=(.{0,30}))/gi;
    while ((m = area.exec(s))) {
      const n = parseAmount(m[1]!);
      if (n === null || n <= 0) continue;
      const before = s.slice(Math.max(0, m.index - 25), m.index);
      const after = (m[3] ?? "").split(/\d/)[0] ?? "";
      const land = /terreno/i.test(after) || /terreno\s+de\s*$/i.test(before);
      set(land ? "m2Land" : "m2Useful", n, s);
    }

    if ((m = /gastos? comunes?\s+(?:de\s+|son\s+|por\s+|como\s+)?(?:unos\s+)?\$?\s*(\d[\d.,]*)\s*(mil|lucas)?/i.exec(s)) || (m = /\bgc\s+(?:de\s+)?\$?\s*(\d[\d.,]*)\s*(mil|lucas)?/i.exec(s))) {
      const n = parseAmount(m[1]!, m[2]);
      if (n !== null && n > 0) set("commonExpensesClp", Math.round(n), s);
    }

    if (/\b(no (se )?aceptan? mascotas|sin mascotas|no se permiten mascotas)\b/i.test(s)) set("pets", "no", s);
    else if (/\b(aceptan?|admiten?|se permiten|acepta)\s+mascotas\b|\bpet friendly\b/i.test(s)) set("pets", "si", s);

    if (/\b(sin amoblar|no (est[aá] )?amoblad[oa])\b/i.test(s)) set("furnished", false, s);
    else if (/\bamoblad[oa]\b/i.test(s)) set("furnished", true, s);

    if ((m = /orientaci[oó]n\s+(nor[- ]?oriente|nor[- ]?poniente|sur[- ]?oriente|sur[- ]?poniente|norte|sur|oriente|poniente)/i.exec(s)) || (m = /orientad[oa]\s+al?\s+(nor[- ]?oriente|nor[- ]?poniente|sur[- ]?oriente|sur[- ]?poniente|norte|sur|oriente|poniente)/i.exec(s))) {
      const v = m[1]!.toLowerCase().replace(/[- ]/g, "");
      set("orientation", v.charAt(0).toUpperCase() + v.slice(1), s);
    }
    if ((m = /\b(?:en el\s+)?piso\s+(\d{1,2})\b/i.exec(s))) set("floor", m[1]!, s);
    if ((m = /\b(?:construid[oa]|construcci[oó]n|del año|año)\s+(?:en\s+|de\s+)?((?:19|20)\d{2})\b/i.exec(s))) set("yearBuilt", m[1]!, s);

    for (const [re, label] of FEATURES) {
      const hit = re.exec(s);
      if (!hit) continue;
      // "no tiene piscina" no la agrega: se mira la negación justo antes de la palabra.
      const before = s.slice(Math.max(0, hit.index - 20), hit.index);
      if (NEGATION.test(before)) continue;
      if (!features.some((f) => f.value === label)) features.push({ value: label, source: s });
    }
  }

  const result = [...out.values()];
  if (features.length) result.push({ key: "features", value: features.map((f) => f.value), source: [...new Set(features.map((f) => f.source))].join(" ") });
  return result;
}

// ---------------------------------------------------------------------------------------------------------
// Validación de lo que propone el modelo.

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

/** La frase de origen tiene que estar en el dictado. Si no, el dato no se dijo y se descarta. */
export function sourceInTranscript(source: string, transcript: string): boolean {
  const s = norm(source).replace(/[.,;!?"]+$/g, "");
  return s.length >= 3 && norm(transcript).includes(s);
}

const llmFieldSchema = z.object({
  campo: z.enum(DICTATION_KEYS as [DictationFieldKey, ...DictationFieldKey[]]),
  valor: z.union([z.number(), z.boolean(), z.string(), z.array(z.string())]),
  frase: z.string().min(1),
});
const llmOutputSchema = z.object({ campos: z.array(z.unknown()) });

function coerce(key: DictationFieldKey, v: FieldValue): FieldValue | null {
  const kind = DICTATION_FIELDS[key].kind;
  if (kind === "int" || kind === "number") {
    const n = typeof v === "number" ? v : typeof v === "string" ? parseAmount(v) : null;
    if (n === null || n < 0) return null;
    return kind === "int" ? Math.round(n) : n;
  }
  if (kind === "bool") return typeof v === "boolean" ? v : v === "si" || v === "sí" ? true : v === "no" ? false : null;
  if (kind === "pets") return v === "si" || v === "no" || v === "consultar" ? v : null;
  if (kind === "list") return Array.isArray(v) ? v.filter((x) => x.trim()).map((x) => x.trim()) : typeof v === "string" ? [v] : null;
  return typeof v === "string" || typeof v === "number" ? String(v) : null;
}

/** Lee la respuesta del modelo (JSON) y deja solo los campos válidos cuya frase está en el dictado. */
export function parseModelExtraction(raw: string, transcript: string): { fields: ExtractedField[]; dropped: number } {
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { fields: [], dropped: 0 };
  }
  const parsed = llmOutputSchema.safeParse(data);
  if (!parsed.success) return { fields: [], dropped: 0 };
  const fields: ExtractedField[] = [];
  let dropped = 0;
  for (const item of parsed.data.campos) {
    const f = llmFieldSchema.safeParse(item);
    if (!f.success) {
      dropped++;
      continue;
    }
    const value = coerce(f.data.campo, f.data.valor);
    if (value === null || !sourceInTranscript(f.data.frase, transcript) || fields.some((x) => x.key === f.data.campo)) {
      dropped++;
      continue;
    }
    fields.push({ key: f.data.campo, value, source: f.data.frase });
  }
  return { fields, dropped };
}

/** Lo del modelo manda; las reglas completan los campos que el modelo no trajo. */
export function mergeExtractions(primary: ExtractedField[], fallback: ExtractedField[]): ExtractedField[] {
  return [...primary, ...fallback.filter((f) => !primary.some((p) => p.key === f.key))];
}

// ---------------------------------------------------------------------------------------------------------
// Instrucciones del modelo, en cinco piezas (Rol, Contexto, Reglas, Formato de salida, Límites).

export const EXTRACTION_SYSTEM = `# Rol
Eres el asistente de ingreso de propiedades de Bull Haus, corredora de propiedades en Santiago de Chile. Lees lo que un corredor dictó mientras recorría una propiedad y propones datos para la ficha.

# Contexto
Solo tienes el dictado. El corredor habla rápido y con lenguaje de terreno: "piezas" o "dormis" son dormitorios, "est" es estacionamiento, "gc" son gastos comunes, "lucas" o "mil" son miles de pesos. Los números pueden venir en palabras ("tres baños").

# Reglas
- Propón un dato solo si el corredor lo dijo. Si no lo dijo, no lo incluyas.
- Cada dato lleva la frase exacta del dictado de la que salió, copiada tal cual.
- No deduzcas: si dijo "casa grande" no inventes metros; si dijo "cerca del metro" no es una característica de la propiedad.
- Si algo es ambiguo (dos cifras distintas para lo mismo), no lo propongas.
- Nunca incluyas nombres, teléfonos ni datos de personas.

# Formato de salida
Solo un objeto JSON, sin texto antes ni después:
{"campos":[{"campo":"bedrooms","valor":3,"frase":"tiene 3 piezas grandes"}]}
Campos posibles: bedrooms, bathrooms, parking, storage (números enteros), m2Useful, m2Land (números), commonExpensesClp (pesos, entero), pets ("si", "no" o "consultar"), furnished (true o false), features (lista de textos cortos, por ejemplo ["Piscina","Quincho"]), orientation, floor, yearBuilt (textos).

# Límites
Si el dictado no habla de una propiedad, responde {"campos":[]}.`;

export interface FichaForText {
  type: string;
  operation: "venta" | "arriendo";
  comuna: string;
  sector: string | null;
  m2Useful: number | null;
  m2Land: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  storage: number | null;
  furnished: boolean | null;
  pets: string | null;
  features: string[];
  details: Record<string, string>;
}

export const DESCRIPTION_SYSTEM = `# Rol
Redactas la descripción comercial de una propiedad para Bull Haus, corredora de Santiago de Chile.

# Contexto
Recibes la ficha ya revisada por el corredor, en JSON. Es tu única fuente.

# Reglas
- Usa solo datos de la ficha. Ninguna cifra, característica ni condición que no esté en ella. Si un dato falta, no lo menciones.
- No incluyas el precio, la dirección exacta ni datos de personas.
- Español de Chile: departamento, estacionamiento, gastos comunes, arriendo. Nunca "piso" por departamento, "alquiler" ni "móvil".
- Primero los datos (comuna, superficie, dormitorios, baños), después lo que la hace distinta.
- Sin "propiedad soñada", "oportunidad única", "no te lo pierdas", exclamaciones ni emojis.

# Formato de salida
Solo el texto de la descripción, de 120 a 200 palabras, en dos o tres párrafos, sin títulos.

# Límites
Si la ficha no tiene superficie ni dormitorios, escribe solo un párrafo corto con lo que hay.`;

// ---------------------------------------------------------------------------------------------------------
// Descripción sin modelo y control de cifras.

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const fmt = (n: number) => n.toLocaleString("es-CL", { maximumFractionDigits: 2 });

/** Descripción con plantilla, desde la ficha. Sobria y sin adornos: el corredor la puede mejorar a mano. */
export function templateDescription(f: FichaForText, typeLabel: string): string {
  const where = `${typeLabel} en ${f.operation} en ${f.comuna}${f.sector ? `, sector ${f.sector}` : ""}.`;
  const data: string[] = [];
  if (f.m2Useful) data.push(`${fmt(f.m2Useful)} m² útiles`);
  if (f.m2Land) data.push(`${fmt(f.m2Land)} m² de terreno`);
  if (f.bedrooms) data.push(plural(f.bedrooms, "dormitorio", "dormitorios"));
  if (f.bathrooms) data.push(plural(f.bathrooms, "baño", "baños"));
  if (f.parking) data.push(plural(f.parking, "estacionamiento", "estacionamientos"));
  if (f.storage) data.push(plural(f.storage, "bodega", "bodegas"));
  const parts = [where];
  if (data.length) parts.push(`Tiene ${data.join(", ").replace(/, ([^,]*)$/, " y $1")}.`);
  const det = Object.entries(f.details).map(([k, v]) => `${k.toLowerCase()} ${v}`);
  if (det.length) parts.push(`${det.join(", ").replace(/^./, (c) => c.toUpperCase())}.`);
  if (f.features.length) parts.push(`Destaca por: ${f.features.join(", ").toLowerCase()}.`);
  if (f.furnished) parts.push("Se entrega amoblado.");
  if (f.pets === "si") parts.push("Acepta mascotas.");
  return parts.join(" ");
}

/** Cifras del texto que no salen de la ficha. Una descripción con alguna no se puede aprobar tal cual. */
export function numbersNotInFicha(text: string, f: FichaForText): string[] {
  const allowed = new Set<string>();
  const add = (n: number | null) => {
    if (n === null || n === undefined) return;
    allowed.add(String(n));
    allowed.add(fmt(n));
  };
  [f.m2Useful, f.m2Land, f.bedrooms, f.bathrooms, f.parking, f.storage].forEach(add);
  for (const s of [...f.features, ...Object.values(f.details), f.comuna, f.sector ?? ""]) for (const m of s.matchAll(/\d[\d.,]*/g)) allowed.add(m[0]);
  const found = [...text.matchAll(/\d[\d.,]*\d|\d/g)].map((m) => m[0].replace(/[.,]$/, ""));
  return [...new Set(found.filter((n) => !allowed.has(n) && !allowed.has(n.replace(/\./g, ""))))];
}
