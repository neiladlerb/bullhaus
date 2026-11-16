"use client";

// Error inesperado fuera del área con menú (login, portales públicos de brochure y KYC).
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-20">
      <h1 className="text-2xl font-bold">No pudimos cargar esta página</h1>
      <p className="mt-2 text-sm text-text">Puede ser un problema momentáneo. Inténtalo de nuevo en unos segundos.</p>
      <button type="button" onClick={reset} className="btn-brand mt-6">
        Intentar de nuevo
      </button>
    </main>
  );
}
