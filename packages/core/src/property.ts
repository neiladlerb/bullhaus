// Ficha de propiedad: valores permitidos, validación y columnas de la planilla
// (docs/propuesta.md, sección 7, y docs/sistema-ia.md, paso 1).
import { z } from "zod";
import { parseChileanDate, parseChileanNumber } from "./format";

export const OPERATIONS = ["venta", "arriendo"] as const;
export const PROPERTY_TYPES = ["casa", "departamento", "oficina", "local", "terreno", "parcela", "otro"] as const;
export const CURRENCIES = ["UF", "CLP"] as const;
export const PROPERTY_STATUSES = ["borrador", "disponible", "reservada", "vendida", "arrendada", "retirada"] as const;
export const PETS = ["si", "no", "consultar"] as const;

export type Operation = (typeof OPERATIONS)[number];
export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type Currency = (typeof CURRENCIES)[number];
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];
export type Pets = (typeof PETS)[number];

export const STATUS_LABELS: Record<PropertyStatus, string> = {
  borrador: "Borrador",
  disponible: "Disponible",
  reservada: "Reservada",
  vendida: "Vendida",
  arrendada: "Arrendada",
  retirada: "Retirada",
};

export const TYPE_LABELS: Record<PropertyType, string> = {
  casa: "Casa",
  departamento: "Departamento",
  oficina: "Oficina",
  local: "Local comercial",
  terreno: "Terreno",
  parcela: "Parcela",
  otro: "Otro",
};

const norm = (v: unknown) =>
  typeof v === "string"
    ? v.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    : v;

const emptyToUndef = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : v);

const enumField = <T extends readonly [string, ...string[]]>(values: T, label: string) =>
  z.preprocess(norm, z.enum(values, { errorMap: () => ({ message: `${label}: usa ${values.join(", ")}` }) }));

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T, label: string) =>
  z.preprocess((v) => emptyToUndef(norm(v)), z.enum(values, { errorMap: () => ({ message: `${label}: usa ${values.join(", ")}` }) }).optional());

const num = (label: string, opts: { int?: boolean; min?: number } = {}) =>
  z.preprocess(
    (v) => {
      if (emptyToUndef(v) === undefined) return undefined;
      const n = parseChileanNumber(v);
      return n === null ? Number.NaN : n;
    },
    z
      .number({ invalid_type_error: `${label}: debe ser un número` })
      .refine((n) => !Number.isNaN(n), `${label}: debe ser un número`)
      .refine((n) => !opts.int || Number.isInteger(n), `${label}: debe ser un número entero`)
      .refine((n) => n >= (opts.min ?? 0), `${label}: no puede ser negativo`)
      .optional(),
  );

const text = (max = 200) => z.preprocess((v) => (typeof v === "string" ? emptyToUndef(v.trim()) : emptyToUndef(v)), z.string().max(max).optional());

const bool = (label: string) =>
  z.preprocess((v) => {
    const s = norm(v);
    if (s === undefined || s === "" || s === null) return undefined;
    if (s === true || s === "si" || s === "s" || s === "true" || s === "1") return true;
    if (s === false || s === "no" || s === "n" || s === "false" || s === "0") return false;
    return "invalido";
  }, z.boolean({ invalid_type_error: `${label}: usa sí o no` }).optional());

export const propertyInputSchema = z.object({
  code: z.preprocess((v) => (typeof v === "string" ? v.trim().toUpperCase() : typeof v === "number" ? String(v) : v), z.string({ required_error: "Código: obligatorio" }).min(1, "Código: obligatorio").max(40)),
  operation: enumField(OPERATIONS, "Operación"),
  type: enumField(PROPERTY_TYPES, "Tipo"),
  comuna: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string({ required_error: "Comuna: obligatoria" }).min(2, "Comuna: obligatoria").max(80)),
  sector: text(120),
  price: num("Precio").refine((n) => n !== undefined && n > 0, "Precio: obligatorio y mayor que cero"),
  currency: z.preprocess((v) => (typeof v === "string" ? v.trim().toUpperCase() : v), z.enum(CURRENCIES, { errorMap: () => ({ message: "Moneda: usa UF o CLP" }) })),
  commonExpensesClp: num("Gastos comunes", { int: true }),
  m2Useful: num("m² útiles"),
  m2Land: num("m² terreno"),
  bedrooms: num("Dormitorios", { int: true }),
  bathrooms: num("Baños", { int: true }),
  parking: num("Estacionamientos", { int: true }),
  storage: num("Bodegas", { int: true }),
  pets: optionalEnum(PETS, "Mascotas"),
  furnished: bool("Amoblado"),
  availableFrom: z.preprocess((v) => {
    if (emptyToUndef(v) === undefined) return undefined;
    return parseChileanDate(v) ?? "invalida";
  }, z.date({ invalid_type_error: "Disponible desde: usa dd/mm/aaaa" }).optional()),
  status: z.preprocess((v) => emptyToUndef(norm(v)) ?? "borrador", z.enum(PROPERTY_STATUSES, { errorMap: () => ({ message: `Estado: usa ${PROPERTY_STATUSES.join(", ")}` }) })),
  brokerEmail: z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.string({ required_error: "Corredor: obligatorio" }).email("Corredor: debe ser el email del corredor")),
  addressPrivate: text(300),
  instagramUrl: z.preprocess((v) => (typeof v === "string" ? emptyToUndef(v.trim()) : emptyToUndef(v)), z.string().url("URL de Instagram no válida").optional()),
  adIds: z.preprocess((v) => {
    if (Array.isArray(v)) return v;
    if (typeof v === "number") return [String(v)];
    if (typeof v !== "string" || v.trim() === "") return [];
    return v.split(/[,;\s]+/).filter(Boolean);
  }, z.array(z.string())),
  description: text(5000),
  publishWeb: bool("Publicar en la web"),
});

export type PropertyInput = z.infer<typeof propertyInputSchema>;

/** Columnas de la planilla: clave en la planilla -> campo de la ficha. */
export const SHEET_COLUMNS = [
  { key: "codigo", field: "code", required: true, example: "109.751", help: "Código de la propiedad (el mismo de la web)" },
  { key: "operacion", field: "operation", required: true, example: "venta", help: "venta o arriendo" },
  { key: "tipo", field: "type", required: true, example: "casa", help: PROPERTY_TYPES.join(", ") },
  { key: "comuna", field: "comuna", required: true, example: "Lo Barnechea", help: "" },
  { key: "sector", field: "sector", required: false, example: "La Dehesa", help: "" },
  { key: "precio", field: "price", required: true, example: "18.500", help: "Sin símbolo; la moneda va en la columna siguiente" },
  { key: "moneda", field: "currency", required: true, example: "UF", help: "UF o CLP" },
  { key: "gastos_comunes_clp", field: "commonExpensesClp", required: false, example: "180.000", help: "En pesos" },
  { key: "m2_utiles", field: "m2Useful", required: false, example: "220", help: "" },
  { key: "m2_terreno", field: "m2Land", required: false, example: "800", help: "" },
  { key: "dormitorios", field: "bedrooms", required: false, example: "4", help: "" },
  { key: "banos", field: "bathrooms", required: false, example: "3", help: "" },
  { key: "estacionamientos", field: "parking", required: false, example: "2", help: "" },
  { key: "bodegas", field: "storage", required: false, example: "1", help: "" },
  { key: "mascotas", field: "pets", required: false, example: "consultar", help: "si, no o consultar" },
  { key: "amoblado", field: "furnished", required: false, example: "no", help: "si o no" },
  { key: "disponible_desde", field: "availableFrom", required: false, example: "01/12/2026", help: "dd/mm/aaaa" },
  { key: "estado", field: "status", required: false, example: "disponible", help: PROPERTY_STATUSES.join(", ") + ". Vacío = borrador" },
  { key: "corredor", field: "brokerEmail", required: true, example: "corredor@bullhaus.cl", help: "Email del corredor en el back office" },
  { key: "direccion_exacta", field: "addressPrivate", required: false, example: "Av. Ejemplo 1234", help: "Solo uso interno, nunca se publica" },
  { key: "url_instagram", field: "instagramUrl", required: false, example: "https://www.instagram.com/p/...", help: "" },
  { key: "ids_anuncio", field: "adIds", required: false, example: "", help: "Ids de anuncios de Meta separados por coma" },
  { key: "descripcion", field: "description", required: false, example: "", help: "Texto aprobado por Bull Haus" },
  { key: "publicar_web", field: "publishWeb", required: false, example: "si", help: "si o no" },
] as const;

export type SheetRow = Record<string, unknown>;

export interface RowError {
  row: number;
  code?: string;
  messages: string[];
}

export interface ValidatedRow {
  row: number;
  data: PropertyInput;
}

const headerKey = (h: string) =>
  h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/²/g, "2")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

/** Convierte filas de la planilla (con sus encabezados) en fichas validadas o errores por fila. */
export function validateSheetRows(
  rows: SheetRow[],
  opts: { knownBrokerEmails: ReadonlySet<string>; firstDataRow?: number },
): { valid: ValidatedRow[]; errors: RowError[] } {
  const first = opts.firstDataRow ?? 2;
  const valid: ValidatedRow[] = [];
  const errors: RowError[] = [];
  const seen = new Map<string, number>();

  rows.forEach((raw, i) => {
    const rowNumber = first + i;
    const byKey: Record<string, unknown> = {};
    for (const [h, v] of Object.entries(raw)) byKey[headerKey(h)] = v;
    if (Object.values(byKey).every((v) => v === undefined || v === null || String(v).trim() === "")) return;

    const mapped: Record<string, unknown> = {};
    for (const col of SHEET_COLUMNS) mapped[col.field] = byKey[col.key];

    const parsed = propertyInputSchema.safeParse(mapped);
    const code = typeof mapped.code === "string" ? mapped.code.trim().toUpperCase() : undefined;
    if (!parsed.success) {
      errors.push({ row: rowNumber, code, messages: parsed.error.issues.map((iss) => iss.message) });
      return;
    }
    const messages: string[] = [];
    if (!opts.knownBrokerEmails.has(parsed.data.brokerEmail)) {
      messages.push(`Corredor: ${parsed.data.brokerEmail} no es un usuario activo del back office`);
    }
    const dup = seen.get(parsed.data.code);
    if (dup !== undefined) messages.push(`Código ${parsed.data.code} repetido (también en la fila ${dup})`);
    if (messages.length) {
      errors.push({ row: rowNumber, code: parsed.data.code, messages });
      return;
    }
    seen.set(parsed.data.code, rowNumber);
    valid.push({ row: rowNumber, data: parsed.data });
  });

  return { valid, errors };
}
