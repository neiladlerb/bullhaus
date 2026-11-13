import type { Metadata } from "next";
import { Header } from "@/components/site";
import { getBrand } from "@/lib/api";

export const metadata: Metadata = { title: "Privacidad y cookies" };

export default async function Privacidad() {
  const brand = await getBrand();
  return (
    <>
      <Header />
      <main className="wrap max-w-3xl py-12 leading-relaxed">
        <h1 className="text-3xl font-light">Privacidad y cookies</h1>
        <p className="mt-6">
          Cuando nos escribes desde este sitio guardamos tu nombre, celular, email y mensaje solo para responder tu consulta y coordinar visitas o valorizaciones. No vendemos ni
          cedemos tus datos.
        </p>
        <h2 className="mt-8 text-xl font-semibold">Dónde se procesan tus datos</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>El sitio, nuestro sistema de gestión y la base de datos funcionan en servidores de la Unión Europea (París).</li>
          <li>
            Cuando te responde nuestro asistente virtual, tu mensaje lo procesa un proveedor de inteligencia artificial en Estados Unidos, con un contrato que le prohíbe usarlo
            para entrenar sus modelos.
          </li>
          <li>Si nos escribes por WhatsApp, Instagram o Facebook, Meta procesa tus mensajes en sus propios servidores, incluidos los de Estados Unidos.</li>
          <li>Las cookies de medición y publicidad de Meta y Google, si las aceptas, también envían datos a esas empresas.</li>
        </ul>
        <h2 className="mt-8 text-xl font-semibold">Cookies</h2>
        <p className="mt-2">
          El sitio usa cookies propias necesarias para funcionar. Las cookies de medición y publicidad (Meta y Google) solo se activan si las aceptas en el aviso de cookies. Puedes
          cambiar tu elección borrando los datos del sitio en tu navegador.
        </p>
        <p className="mt-2">
          Mientras navegas, el sitio guarda en tu navegador, solo hasta que cierras la pestaña, la página por la que entraste y el sitio o anuncio desde el que llegaste. Si nos
          envías un formulario, ese origen se guarda junto a tu consulta para saber qué canal funciona. No es una cookie y no se comparte con terceros.
        </p>
        <h2 className="mt-8 text-xl font-semibold">Tus derechos</h2>
        <p className="mt-2">
          Puedes pedir acceso, corrección o eliminación de tus datos escribiendo a{" "}
          <a href={`mailto:${brand.contact.email}`} className="text-brand underline">
            {brand.contact.email}
          </a>
          .
        </p>
      </main>
    </>
  );
}
