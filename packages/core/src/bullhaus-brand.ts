// Ficha de marca inicial de Bull Haus, con los mismos datos que tenía la web en código
// (tomados de www.bullhaus.cl). Después se edita en el back office, en Ajustes → Marca.
import type { Brand } from "./brand";

export const BULLHAUS_BRAND: Brand = {
  name: "Bull Haus Propiedades",
  shortName: "Bull Haus",
  legalName: "Bull Haus Intermediación y Gestión Inmobiliaria",
  siteUrl: "https://www.bullhaus.cl",
  description: "Venta, arriendo y asesoría inmobiliaria en el sector oriente de Santiago y en Zapallar, Papudo, Cachagua, Maitencillo y Viña del Mar.",
  logo: { lines: ["BULL", "HAUS"], subtitle: "PROPIEDADES", iconUrl: "/logo-bullhaus.png" },
  colors: { brand: "#ea2b94", brandDark: "#c8177a", ink: "#2f2f2e", coal: "#3f3f3e" },
  contact: {
    whatsapp: "+56 9 9200 0211",
    email: "contacto@bullhaus.cl",
    office: "San Sebastián 2957, Las Condes",
    mapsUrl: "https://maps.app.goo.gl/2QbtxZvy1AJU1VL59",
  },
  social: {
    instagram: { url: "https://www.instagram.com/bullhaus_propiedades/", handle: "@bullhaus_propiedades" },
    facebook: { url: "https://www.facebook.com/BullHauspropiedades", handle: "BullHauspropiedades" },
  },
  texts: {
    heroEyebrow: "Venta, arriendo y asesoría inmobiliaria",
    heroTitle: "Gestión inmobiliaria profesional, de principio a fin",
    heroHighlight: "profesional",
    heroSubtitle: "Compra, venta y arriendo en el sector oriente de Santiago y la V Región costa, con un corredor que te acompaña en cada paso.",
    heroImage: "/hero-casa.webp",
    ownerPitch: "Un corredor de Bull Haus visita tu propiedad, te entrega una valorización y te propone cómo publicarla. Trabajamos en el sector oriente de Santiago y en la V Región costa.",
    ownerAreas: "Trabajamos en Las Condes, Vitacura, Lo Barnechea, Providencia, Ñuñoa y en Zapallar, Papudo, Cachagua, Maitencillo y Viña del Mar.",
    aboutTitle: "Experiencia desde 2012",
    aboutParagraphs: [
      "Bull Haus nace de combinar la experiencia de Steinsapir & Stitchkin Propiedades, en el mercado desde 2012, con una visión de futuro: llevar a cada cliente un servicio personalizado, profesional, humano, transparente, ágil y de excelencia.",
      "Nos especializamos en corretaje e intermediación en el sector oriente de Santiago y en Zapallar, Papudo, Cachagua, Maitencillo y Viña del Mar. Lo complementamos con desarrollo y gestión inmobiliaria en toda la Región Metropolitana y la V Región costa.",
    ],
  },
  zones: [
    { key: "santiago", name: "Sector oriente de Santiago", detail: "Las Condes, Vitacura, Lo Barnechea, Providencia y Ñuñoa", comunas: [], image: "/zona-santiago.webp" },
    {
      key: "costa",
      name: "V Región costa",
      detail: "Zapallar, Papudo, Cachagua, Maitencillo y Viña del Mar",
      comunas: ["Zapallar", "Papudo", "Cachagua", "Maitencillo", "Viña del Mar", "Puchuncaví", "Concón", "Quintero"],
      image: "/zona-costa.webp",
    },
  ],
  team: [
    { name: "Rodrigo Abbott Irarrázaval", role: "Socio · Broker inmobiliario", email: "rodrigo@bullhaus.cl", photo: "/equipo/rodrigo.jpg" },
    { name: "Alejandro Steinsapir Stitchkin", role: "Socio · Broker inmobiliario", email: "alejandro@bullhaus.cl", photo: "/equipo/alejandro.png" },
    { name: "Sandra Cáceres", role: "Broker inmobiliario", email: "sandra@bullhaus.cl", photo: "/equipo/sandra.png" },
    { name: "Manuel José Vial", role: "Broker inmobiliario V Región costa", email: "manuel@bullhaus.cl" },
    { name: "Santiago Andrés Krogh", role: "Broker", email: "santiago@bullhaus.cl", photo: "/equipo/santiago.jpg" },
  ],
};
