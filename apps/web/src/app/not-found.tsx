import Link from "next/link";
import { Header } from "@/components/site";

// Página propia para direcciones que no existen o propiedades que ya no están disponibles (textos.md, Errores).
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="wrap py-20">
        <h1 className="text-3xl font-light text-heading md:text-4xl">No encontramos esta página</h1>
        <p className="mt-3 max-w-[65ch] text-text">Puede que la propiedad ya se haya vendido o arrendado, o que el enlace tenga un error. Revisa las propiedades disponibles hoy.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/propiedades" className="btn-brand">
            Ver propiedades disponibles
          </Link>
          <Link href="/" className="btn-line text-ink">
            Ir al inicio
          </Link>
        </div>
      </main>
    </>
  );
}
