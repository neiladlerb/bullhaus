import type { MetadataRoute } from "next";
import { BULLHAUS_BRAND } from "@bullhaus/core";

// El back office se instala en el celular como app (Android: "Instalar app"; iPhone: Compartir > "Agregar a
// inicio"), sin tienda de aplicaciones. Abre directo en la agenda, que es lo que el corredor mira en terreno.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bull Haus Corredores",
    short_name: "Bull Haus",
    description: "Agenda, propiedades, dictado de fichas y clientes de Bull Haus.",
    start_url: "/agenda",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "white",
    theme_color: BULLHAUS_BRAND.colors.coal,
    lang: "es-CL",
    icons: [
      { src: "/iconos/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Agenda", url: "/agenda" },
      { name: "Dictar una propiedad", url: "/dictado" },
    ],
  };
}
