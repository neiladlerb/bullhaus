/**
 * Logo oficial de Bull Haus Propiedades (el mismo de la web). `light` usa la versión con texto blanco, para el menú
 * oscuro. Los archivos están en public/ y se generaron desde apps/web/public/logo-bullhaus.png.
 */
export function Logo({ light = false, size = 72 }: { light?: boolean; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={light ? "/logo-bullhaus-claro.png" : "/logo-bullhaus.png"} alt="Bull Haus Propiedades" width={size} height={size} className="shrink-0" />
  );
}
