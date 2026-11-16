import Link from "next/link";

// Dirección inexistente fuera del área con menú (textos.md, Errores).
export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20">
      <h1 className="text-2xl font-bold">No encontramos esta página</h1>
      <p className="mt-2 text-sm text-text">El enlace puede estar incompleto o la página ya no existe.</p>
      <Link href="/" className="btn-brand mt-6">
        Ir al inicio
      </Link>
    </main>
  );
}
