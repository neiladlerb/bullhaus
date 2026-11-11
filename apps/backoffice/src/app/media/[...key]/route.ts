import { getFile } from "@/lib/storage";

// Sirve solo el almacenamiento público (fotos). Los documentos privados nunca salen por aquí.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const path = key.join("/");
  if (!/^properties\/[\w-]+\/[\w-]+\/(sm|md|lg)\.webp$/.test(path)) return new Response("No encontrado", { status: 404 });
  const file = await getFile("public", path);
  if (!file) return new Response("No encontrado", { status: 404 });
  return new Response(new Uint8Array(file), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
