// Mientras carga una página: el aviso es texto (lector de pantalla) y no una animación decorativa.
export default function Loading() {
  return (
    <main className="wrap py-20" aria-busy="true">
      <p role="status" className="text-muted">
        Cargando…
      </p>
    </main>
  );
}
