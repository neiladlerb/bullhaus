"use client";
import Link from "next/link";

// Error inesperado al cargar una página. Dice qué pasó y qué hacer, sin códigos técnicos (textos.md, Errores).
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="wrap py-20">
      <h1 className="text-3xl font-light text-heading md:text-4xl">No pudimos cargar esta página</h1>
      <p className="mt-3 max-w-[65ch] text-text">Puede ser un problema momentáneo. Inténtalo de nuevo en unos segundos; si sigue, escríbenos por WhatsApp y te ayudamos.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="btn-brand">
          Intentar de nuevo
        </button>
        <Link href="/" className="btn-line text-ink">
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
