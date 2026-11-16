// Mientras carga una pantalla: el menú queda visible y el aviso es texto, no una animación decorativa.
export default function Loading() {
  return (
    <p role="status" aria-busy="true" className="text-sm text-muted">
      Cargando…
    </p>
  );
}
