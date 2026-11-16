"use client";

// Error inesperado dentro del área con menú: el menú sigue visible para salir de aquí (textos.md, Errores).
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="max-w-xl rounded-lg border border-danger/30 bg-danger-soft p-6">
      <h1 className="text-xl font-bold">No pudimos cargar esta pantalla</h1>
      <p className="mt-2 text-sm text-text">Revisa tu conexión e inténtalo de nuevo. Si sigue, avísale a administración{error.digest ? ` con este código: ${error.digest}` : ""}.</p>
      <button type="button" onClick={reset} className="btn-ghost mt-5">
        Intentar de nuevo
      </button>
    </div>
  );
}
