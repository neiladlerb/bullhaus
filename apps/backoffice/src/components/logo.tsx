/**
 * Logotipo provisional de Bull Haus en código (marco magenta abierto con "BULL / HAUS").
 * [PENDIENTE] Reemplazar por los archivos oficiales del logo (versión color y versión blanca).
 */
export function Logo({ light = false }: { light?: boolean }) {
  const text = light ? "#ffffff" : "#3f3f3e";
  return (
    <div className="inline-flex flex-col" aria-label="Bull Haus Propiedades">
      <svg width="96" height="62" viewBox="0 0 96 62" aria-hidden="true">
        <path d="M60 4 H4 V58 H92 V30" fill="none" stroke="#ea2b94" strokeWidth="2.5" />
        <text x="12" y="27" fontSize="17" fontWeight="600" letterSpacing="3" fill={text} fontFamily="Raleway, Arial, sans-serif">BULL</text>
        <text x="12" y="47" fontSize="17" fontWeight="600" letterSpacing="3" fill={text} fontFamily="Raleway, Arial, sans-serif">HAUS</text>
      </svg>
      <span className="mt-1 text-[8px] tracking-[0.35em]" style={{ color: text }}>PROPIEDADES</span>
    </div>
  );
}
