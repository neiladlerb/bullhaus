import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

// Almacenamiento local para desarrollo. En producción se reemplaza por Supabase Storage
// con la misma interfaz. "public" = fotos que pueden salir en la web; "private" = mandatos y documentos.
export type Bucket = "public" | "private";

const ROOT = resolve(process.env.STORAGE_DIR ?? join(process.cwd(), "..", "..", "storage"));

function safePath(bucket: Bucket, key: string): string {
  const base = join(ROOT, bucket);
  const full = normalize(join(base, key));
  if (!full.startsWith(base + sep)) throw new Error("Ruta de archivo no válida");
  return full;
}

export async function putFile(bucket: Bucket, key: string, data: Buffer): Promise<void> {
  const path = safePath(bucket, key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
}

export async function getFile(bucket: Bucket, key: string): Promise<Buffer | null> {
  try {
    return await readFile(safePath(bucket, key));
  } catch {
    return null;
  }
}

export async function removePrefix(bucket: Bucket, prefix: string): Promise<void> {
  await rm(safePath(bucket, prefix), { recursive: true, force: true });
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
