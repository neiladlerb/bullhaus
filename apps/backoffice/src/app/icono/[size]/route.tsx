import { ImageResponse } from "next/og";
import { BULLHAUS_BRAND } from "@bullhaus/core";

// Ícono de la app instalada, dibujado al vuelo (no hay que mantener PNG a mano). Carbón de la marca con "BH"
// en blanco. La variante "maskable" deja margen para que Android lo recorte en círculo sin cortar las letras.

export async function GET(req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const size = raw === "512" ? 512 : raw === "180" ? 180 : 192;
  const maskable = new URL(req.url).searchParams.has("maskable");
  const font = Math.round(size * (maskable ? 0.32 : 0.42));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BULLHAUS_BRAND.colors.coal, color: "white", fontSize: font, fontWeight: 700, letterSpacing: -2 }}>
        BH
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
