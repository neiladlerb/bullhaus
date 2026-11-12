import type { Metadata } from "next";
import { CONTACT, Header } from "@/components/site";

export const metadata: Metadata = { title: "Privacidad y cookies" };

export default function Privacidad() {
  return (
    <>
      <Header />
      <main className="wrap max-w-3xl py-12 leading-relaxed">
        <h1 className="text-3xl font-light">Privacidad y cookies</h1>
        <p className="mt-6">
          Cuando nos escribes desde este sitio guardamos tu nombre, celular, email y mensaje solo para responder tu consulta y coordinar visitas o valorizaciones. No vendemos ni
          cedemos tus datos.
        </p>
        <h2 className="mt-8 text-xl font-semibold">Cookies</h2>
        <p className="mt-2">
          El sitio usa cookies propias necesarias para funcionar. Las cookies de medición y publicidad (Meta y Google) solo se activan si las aceptas en el aviso de cookies. Puedes
          cambiar tu elección borrando los datos del sitio en tu navegador.
        </p>
        <h2 className="mt-8 text-xl font-semibold">Tus derechos</h2>
        <p className="mt-2">
          Puedes pedir acceso, corrección o eliminación de tus datos escribiendo a{" "}
          <a href={`mailto:${CONTACT.email}`} className="text-brand underline">
            {CONTACT.email}
          </a>
          .
        </p>
      </main>
    </>
  );
}
