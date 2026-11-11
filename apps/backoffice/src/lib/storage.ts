import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createSupabaseStorage, type StorageDriver } from "./storage-supabase";

// "public" = fotos que pueden salir en la web; "private" = mandatos y documentos de la operación.
// Los documentos de KYC no van aquí: tendrán su propio almacenamiento aparte (ver CLAUDE.md).
export type Bucket = "public" | "private";

// Con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY se usa Supabase Storage (producción, Vercel).
// Sin ellas, disco local en STORAGE_DIR (desarrollo). En Vercel el disco no persiste.
const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseStorage(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

const SUPABASE_BUCKETS: Record<Bucket, string> = {
  public: process.env.SUPABASE_BUCKET_PUBLIC ?? "fotos",
  private: process.env.SUPABASE_BUCKET_PRIVATE ?? "documentos",
};

if (!supabase && process.env.VERCEL) {
  throw new Error("Falta configurar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY: en Vercel no hay disco persistente");
}

const ROOT = resolve(process.env.STORAGE_DIR ?? join(process.cwd(), "..", "..", "storage"));

function safeKey(key: string): string {
  const clean = normalize(key).split(sep).join("/");
  if (clean.startsWith("..") || clean.startsWith("/") || clean.includes("/../") || !/^[\w./-]+$/.test(clean)) {
    throw new Error("Ruta de archivo no válida");
  }
  return clean;
}

function safePath(bucket: Bucket, key: string): string {
  const base = join(ROOT, bucket);
  const full = normalize(join(base, key));
  if (!full.startsWith(base + sep)) throw new Error("Ruta de archivo no válida");
  return full;
}

const localDriver: StorageDriver = {
  async put(bucket, key, data) {
    const path = safePath(bucket as Bucket, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  },
  async get(bucket, key) {
    try {
      return await readFile(safePath(bucket as Bucket, key));
    } catch {
      return null;
    }
  },
  async removePrefix(bucket, prefix) {
    await rm(safePath(bucket as Bucket, prefix), { recursive: true, force: true });
  },
};

const driver: StorageDriver = supabase ?? localDriver;
const bucketName = (b: Bucket) => (supabase ? SUPABASE_BUCKETS[b] : b);

function contentTypeFor(key: string): string {
  if (key.endsWith(".webp")) return "image/webp";
  if (key.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

export async function putFile(bucket: Bucket, key: string, data: Buffer): Promise<void> {
  const k = safeKey(key);
  await driver.put(bucketName(bucket), k, data, contentTypeFor(k));
}

export async function getFile(bucket: Bucket, key: string): Promise<Buffer | null> {
  return driver.get(bucketName(bucket), safeKey(key));
}

export async function removePrefix(bucket: Bucket, prefix: string): Promise<void> {
  await driver.removePrefix(bucketName(bucket), safeKey(prefix));
}

export const PHOTO_SIZES = { sm: 480, md: 1200, lg: 2000 } as const;
export type PhotoSize = keyof typeof PHOTO_SIZES;

/** Guarda una foto en tres tamaños WebP. Devuelve la carpeta y las claves de cada tamaño. */
export async function savePhoto(propertyId: string, input: Buffer): Promise<{ folder: string; sizes: Record<PhotoSize, string> }> {
  const folder = `properties/${propertyId}/${randomUUID()}`;
  const sizes = {} as Record<PhotoSize, string>;
  for (const [name, width] of Object.entries(PHOTO_SIZES) as [PhotoSize, number][]) {
    const out = await sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    const key = `${folder}/${name}.webp`;
    await putFile("public", key, out);
    sizes[name] = key;
  }
  return { folder, sizes };
}
