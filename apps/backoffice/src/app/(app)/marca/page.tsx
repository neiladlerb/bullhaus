import { BrandSchema, brandToForm } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { requireUser } from "@/lib/auth";
import { saveBrandAction } from "./actions";

// Ficha de marca de la corredora: lo que la web pública muestra de ella. Los cambios se ven en la
// web en unos 5 minutos (la web guarda la ficha en caché ese tiempo).

type Field = { name: string; label: string; hint?: string; rows?: number; type?: string };

const SECTIONS: { title: string; note?: string; fields: Field[] }[] = [
  {
    title: "Identidad",
    fields: [
      { name: "name", label: "Nombre comercial", hint: "Ej.: Bull Haus Propiedades" },
      { name: "shortName", label: "Nombre corto", hint: "Para frases como «un corredor de Bull Haus»" },
      { name: "legalName", label: "Razón social", hint: "Va en el pie de página" },
      { name: "siteUrl", label: "Dirección del sitio web", hint: "https://www.ejemplo.cl" },
      { name: "description", label: "Descripción para Google", hint: "Hasta 300 caracteres; también va en el pie de página", rows: 2 },
    ],
  },
  {
    title: "Logo y colores",
    note: "Sin imagen de logo, la web dibuja un logotipo con las líneas de texto dentro de un marco del color principal.",
    fields: [
      { name: "logoImageUrl", label: "Imagen del logo (opcional)", hint: "Ruta /logo.png o URL https" },
      { name: "logoIconUrl", label: "Ícono de la pestaña (opcional)" },
      { name: "logoLines", label: "Líneas del logotipo", hint: "Separadas por coma, hasta 3. Ej.: BULL, HAUS" },
      { name: "logoSubtitle", label: "Subtítulo del logotipo", hint: "Ej.: PROPIEDADES" },
      { name: "colorBrand", label: "Color principal", type: "color" },
      { name: "colorBrandDark", label: "Color principal oscuro", type: "color" },
      { name: "colorInk", label: "Color del texto", type: "color" },
      { name: "colorCoal", label: "Color de fondos oscuros", type: "color" },
    ],
  },
  {
    title: "Contacto y redes",
    fields: [
      { name: "whatsapp", label: "WhatsApp", hint: "Con código de país: +56 9 1234 5678" },
      { name: "email", label: "Email de contacto", type: "email" },
      { name: "office", label: "Oficina" },
      { name: "mapsUrl", label: "Enlace a Google Maps (opcional)" },
      { name: "instagram", label: "Instagram", hint: "@cuenta | https://www.instagram.com/cuenta/" },
      { name: "facebook", label: "Facebook", hint: "Nombre | https://www.facebook.com/pagina" },
      { name: "linkedin", label: "LinkedIn", hint: "Nombre | https://www.linkedin.com/company/pagina" },
    ],
  },
  {
    title: "Textos de la web",
    fields: [
      { name: "heroEyebrow", label: "Antetítulo de la portada" },
      { name: "heroTitle", label: "Título de la portada" },
      { name: "heroHighlight", label: "Palabra del título en negrita (opcional)" },
      { name: "heroSubtitle", label: "Bajada de la portada", rows: 2 },
      { name: "heroImage", label: "Foto de la portada", hint: "Ruta /portada.webp o URL https" },
      { name: "ownerPitch", label: "Texto para propietarios en la portada", rows: 3 },
      { name: "ownerAreas", label: "Zonas en palabras (página de propietarios)", rows: 2 },
      { name: "aboutTitle", label: "Título de «Quiénes somos»" },
      { name: "aboutParagraphs", label: "Párrafos de «Quiénes somos»", hint: "Un párrafo por línea, hasta 4", rows: 6 },
    ],
  },
  {
    title: "Zonas y equipo",
    note: "Una zona o persona por línea, con los campos separados por «|». Una zona sin comunas incluye todas las que no están en otra zona.",
    fields: [
      { name: "zones", label: "Zonas", hint: "clave | Nombre | Detalle | comuna, comuna | /imagen.webp", rows: 4 },
      { name: "team", label: "Equipo", hint: "Nombre | Cargo | email | /foto.jpg", rows: 6 },
    ],
  },
];

export default async function MarcaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("brand.manage");
  const sp = await searchParams;
  const row = await prisma.tenantBrand.findUnique({ where: { tenantId: user.tenantId }, select: { data: true, updatedAt: true } });
  const parsed = BrandSchema.safeParse(row?.data);
  const values = parsed.success ? brandToForm(parsed.data) : {};

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Marca y sitio web</h1>
        <p className="mt-1 text-sm text-muted">
          Lo que la web pública muestra de la corredora. Los cambios se ven en la web en unos 5 minutos.
          {row && ` Última modificación: ${row.updatedAt.toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "short", timeStyle: "short", hour12: false })}.`}
        </p>
      </div>
      {sp.ok && <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Ficha guardada.</p>}
      {sp.error && <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">No se guardó. {sp.error}</p>}
      {!row && <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">Esta corredora aún no tiene ficha: la web se muestra con una marca neutra hasta que la completes.</p>}

      <form action={saveBrandAction} className="space-y-6">
        {SECTIONS.map((s) => (
          <section key={s.title} className="card space-y-4 p-5">
            <div>
              <h2 className="font-medium">{s.title}</h2>
              {s.note && <p className="mt-1 text-xs text-muted">{s.note}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {s.fields.map((f) => (
                <label key={f.name} className={f.rows && f.rows > 2 ? "sm:col-span-2" : ""}>
                  <span className="label">{f.label}</span>
                  {f.rows ? (
                    <textarea name={f.name} rows={f.rows} className="input font-mono text-xs" defaultValue={values[f.name] ?? ""} />
                  ) : (
                    <input name={f.name} type={f.type ?? "text"} className={f.type === "color" ? "input h-10 p-1" : "input"} defaultValue={values[f.name] ?? (f.type === "color" ? "#3f3f3e" : "")} />
                  )}
                  {f.hint && <span className="mt-1 block text-xs text-muted">{f.hint}</span>}
                </label>
              ))}
            </div>
          </section>
        ))}
        <button className="btn-primary">Guardar ficha</button>
      </form>
    </div>
  );
}
