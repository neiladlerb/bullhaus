import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { CONTACT, Header } from "@/components/site";
import { getProperties, photoUrl } from "@/lib/api";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Vende o arrienda tu propiedad",
  description: "Un corredor de Bull Haus visita tu propiedad y te entrega una valorización. Sector oriente de Santiago y V Región costa.",
};

const STEPS = [
  { t: "Conversamos", d: "Nos cuentas qué propiedad tienes y qué quieres hacer con ella." },
  { t: "Valorización", d: "Un corredor la visita y te entrega una valorización fundamentada." },
  { t: "Publicación", d: "Preparamos la ficha, las fotos y la difusión. Tú apruebas antes de publicar." },
  { t: "Acompañamiento", d: "Coordinamos visitas, ofertas y te acompañamos hasta la firma." },
];

export default async function Vender() {
  const props = await getProperties();
  const img = props.find((p) => p.type === "casa" && p.photos.length)?.photos[0];
  return (
    <>
      <section className="relative isolate overflow-hidden bg-coal text-white">
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl(img.lg)} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40" />
        )}
        <Header overlay />
        <div className="wrap grid gap-10 pb-16 pt-36 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-white/90">Propietarios</p>
            <h1 className="mt-3 text-4xl font-light leading-tight md:text-5xl">Vende o arrienda tu propiedad con Bull Haus</h1>
            <p className="mt-5 max-w-lg text-lg text-white/85">
              Trabajamos en Las Condes, Vitacura, Lo Barnechea, Providencia, Ñuñoa y en Zapallar, Papudo, Cachagua, Maitencillo y Viña del Mar.
            </p>
            <p className="mt-6 text-sm text-white/70">
              ¿Prefieres hablar? WhatsApp{" "}
              <a href={CONTACT.whatsappUrl} className="font-semibold text-white underline">
                {CONTACT.whatsapp}
              </a>
            </p>
          </div>
          <div className="rounded-3xl bg-white p-6 text-ink shadow-2xl md:p-8">
            <h2 className="text-xl font-semibold">Pide una valorización</h2>
            <p className="mb-5 mt-1 text-sm text-muted">Te llamamos para coordinar la visita.</p>
            <ContactForm kind="propietario" submitLabel="Pedir valorización" messagePlaceholder="Tipo de propiedad, comuna, dormitorios y si quieres vender o arrendar" />
          </div>
        </div>
      </section>
      <section className="wrap py-20">
        <p className="eyebrow">Cómo trabajamos</p>
        <h2 className="mt-2 text-3xl font-light">De la primera conversación a la firma</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.t} className="rounded-2xl bg-sand p-6">
              <span className="text-3xl font-light text-brand">{i + 1}</span>
              <p className="mt-3 font-semibold">{s.t}</p>
              <p className="mt-1 text-sm text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
