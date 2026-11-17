import { ImageResponse } from "next/og";
import sharp from "sharp";
import { BULLHAUS_BRAND, BULLHAUS_PUBLIC, formatPrice, orderedPhotos, parseBrochureDesign, TYPE_LABELS } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { getCurrentUser } from "@/lib/auth";
import { brochureFacts, brochurePropertySelect, canShare, captacionShowcase } from "@/lib/brochures";
import { getFile } from "@/lib/storage";

// Imagen para redes del brochure: post cuadrado de Instagram y Facebook (1080x1080) e historia vertical (1080x1920).
// Sale del diseño guardado y de la ficha aprobada, igual que el brochure. Se publica a mano y solo con el brochure
// aprobado; mientras tanto el equipo la ve como vista previa.
export const runtime = "nodejs";

const FORMATS = { post: { w: 1080, h: 1080, photoH: 1080 }, historia: { w: 1080, h: 1920, photoH: 1180 } } as const;
const C = BULLHAUS_BRAND.colors;

/** Las fotos están en WebP y el generador de imágenes no lo lee: se pasan a JPEG del tamaño justo. */
async function photoData(sizes: unknown, w: number, h: number): Promise<string | null> {
  const s = sizes as Record<string, string>;
  const key = s.lg ?? s.md;
  if (!key) return null;
  const file = await getFile("public", key);
  if (!file) return null;
  const jpg = await sharp(file).resize(w, h, { fit: "cover" }).jpeg({ quality: 82 }).toBuffer();
  return `data:image/jpeg;base64,${jpg.toString("base64")}`;
}

async function logoData(origin: string): Promise<string | null> {
  try {
    const res = await fetch(new URL("/logo-bullhaus-claro.png", origin));
    if (!res.ok) return null;
    return `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ token: string; formato: string }> }) {
  const { token, formato } = await params;
  if (formato !== "post" && formato !== "historia") return new Response("No encontrado", { status: 404 });
  const f = FORMATS[formato];
  const b = await prisma.brochure.findUnique({ where: { token }, include: { property: { select: brochurePropertySelect } } });
  if (!b) return new Response("No encontrado", { status: 404 });
  const team = await getCurrentUser();
  const preview = !!team && team.tenantId === b.tenantId;
  if (!canShare(b.status, b.property?.status, b.kind) && !preview) return new Response("No disponible", { status: 404 });

  const design = parseBrochureDesign(b.design);
  const p = b.property;
  let coverSizes: unknown = p ? orderedPhotos(p.media, design)[0]?.sizes : undefined;
  if (!p) coverSizes = (await captacionShowcase(b.tenantId))[0]?.media[0]?.sizes;
  const [photo, logo] = await Promise.all([coverSizes ? photoData(coverSizes, f.w, f.photoH) : null, logoData(new URL(req.url).origin)]);

  const kicker = p ? `${TYPE_LABELS[p.type]} en ${p.operation}, ${p.comuna}` : "Vende o arrienda con Bull Haus";
  const price = p ? `${formatPrice(Number(p.price), p.currency)}${p.operation === "arriendo" ? " / mes" : ""}` : null;
  const facts = p ? brochureFacts(p).slice(0, 4) : BULLHAUS_PUBLIC.zones.slice(0, 4);
  const cta = p ? "Escríbenos por WhatsApp" : "Pide tu valorización";
  const story = formato === "historia";

  const text = (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {design.badge && (
        <div style={{ display: "flex" }}>
          <div style={{ background: C.brandDark, color: "white", fontSize: 30, fontWeight: 700, padding: "8px 24px", borderRadius: 40 }}>{design.badge}</div>
        </div>
      )}
      <div style={{ fontSize: 34, opacity: 0.9 }}>{kicker}</div>
      <div style={{ fontSize: story ? 72 : 62, fontWeight: 700, lineHeight: 1.1 }}>{b.title}</div>
      {price && <div style={{ fontSize: story ? 64 : 56, fontWeight: 700 }}>{price}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {facts.map((x) => (
          <div key={x} style={{ fontSize: 30, padding: "8px 20px", borderRadius: 30, border: "2px solid rgba(255,255,255,0.7)" }}>{x}</div>
        ))}
      </div>
    </div>
  );

  return new ImageResponse(
    story ? (
      <div style={{ width: f.w, height: f.h, display: "flex", flexDirection: "column", background: C.coal, color: "white" }}>
        <div style={{ position: "relative", display: "flex", width: f.w, height: f.photoH }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {photo && <img src={photo} alt="" width={f.w} height={f.photoH} style={{ objectFit: "cover" }} />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo && <img src={logo} alt="" width={180} height={180} style={{ position: "absolute", top: 60, left: 60 }} />}
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flexGrow: 1, padding: "50px 70px 70px" }}>
          {text}
          <div style={{ display: "flex", justifyContent: "center", background: C.brandDark, borderRadius: 60, padding: "26px 0", fontSize: 40, fontWeight: 700 }}>{cta}</div>
        </div>
      </div>
    ) : (
      <div style={{ width: f.w, height: f.h, display: "flex", position: "relative", background: C.coal, color: "white" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photo && <img src={photo} alt="" width={f.w} height={f.h} style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }} />}
        <div style={{ position: "absolute", top: 0, left: 0, width: f.w, height: f.h, display: "flex", backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.25) 100%)" }} />
        <div style={{ position: "absolute", top: 0, left: 0, width: f.w, height: f.h, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo ? <img src={logo} alt="" width={160} height={160} /> : <div style={{ display: "flex" }} />}
          {text}
        </div>
      </div>
    ),
    { width: f.w, height: f.h, headers: { "Cache-Control": "private, no-store" } },
  );
}
