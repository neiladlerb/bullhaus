// Serie editorial "Bull Haus te asesora" para la página de empresa de Bull Haus en LinkedIn.
// Son textos base que una persona de Bull Haus revisa y aprueba antes de publicar (nunca se publican solos).
// Reglas: sin cifras ni condiciones que no estén en la base de conocimiento, sin asesoría de crédito
// ni legal (se deriva a un profesional), sin referencias a condiciones personales (Ley 20.609).

export const LINKEDIN_SERIES = "Bull Haus te asesora";

export type TipTopic = "vender" | "comprar" | "arrendar";

export const TIP_TOPIC_LABELS: Record<TipTopic, string> = {
  vender: "Cómo vender",
  comprar: "Qué comprar mejor",
  arrendar: "Arrendar tu propiedad",
};

export interface LinkedInTip {
  key: string;
  topic: TipTopic;
  title: string;
  /** Primera línea: lo que se ve antes del "ver más". */
  hook: string;
  points: string[];
  closing: string;
}

export const LINKEDIN_TIPS: LinkedInTip[] = [
  {
    key: "precio-fundamentado",
    topic: "vender",
    title: "El precio se fundamenta, no se adivina",
    hook: "El error más caro al vender es publicar con un precio \"para probar\".",
    points: [
      "Compara con propiedades parecidas que se vendieron, no solo con las que están publicadas.",
      "Mira la misma comuna y el mismo tipo de propiedad: superficie, orientación, piso y estacionamientos cambian el valor.",
      "Una propiedad que pasa meses publicada pierde atractivo y termina negociándose peor.",
    ],
    closing: "Antes de publicar, pide una valorización con un corredor que visite la propiedad.",
  },
  {
    key: "papeles-al-dia",
    topic: "vender",
    title: "Ordena los papeles antes de publicar",
    hook: "Muchas ventas se atrasan por documentos, no por falta de compradores.",
    points: [
      "Ten a mano los certificados de la propiedad: dominio vigente, hipotecas y gravámenes, y avalúo fiscal.",
      "Revisa que las contribuciones y los gastos comunes estén al día.",
      "Si hay ampliaciones, confirma que estén regularizadas.",
    ],
    closing: "Con los papeles listos, el comprador decide más rápido. Para dudas legales, consulta con un abogado.",
  },
  {
    key: "fotos-que-venden",
    topic: "vender",
    title: "Las fotos son la primera visita",
    hook: "Muchos compradores deciden si visitan tu propiedad solo con mirar las fotos.",
    points: [
      "Fotografía con luz natural y ventanas despejadas.",
      "Ordena y despeja: menos objetos hacen ver los espacios más amplios.",
      "Muestra lo que de verdad tiene la propiedad. Retocar de más genera visitas que terminan en desilusión.",
    ],
    closing: "Una buena primera impresión empieza antes de abrir la puerta.",
  },
  {
    key: "preparar-visita",
    topic: "vender",
    title: "Cómo preparar una visita",
    hook: "Una visita bien preparada vale más que diez visitas improvisadas.",
    points: [
      "Ventila, abre cortinas y enciende las luces antes de que llegue el interesado.",
      "Arregla lo pequeño: una llave que gotea o un enchufe suelto restan más de lo que parece.",
      "Deja que el corredor muestre la propiedad; el comprador se siente más libre para preguntar.",
    ],
    closing: "Coordinamos cada visita y te contamos qué dijo cada interesado.",
  },
  {
    key: "exclusividad",
    topic: "vender",
    title: "Publicar en todas partes no siempre vende más",
    hook: "La misma propiedad con cinco precios distintos en internet confunde a cualquier comprador.",
    points: [
      "Un solo responsable mantiene el precio, las fotos y la información coherentes en todos los portales.",
      "Te da un único interlocutor para las visitas y las ofertas.",
      "Permite medir qué funciona y ajustar la estrategia con datos.",
    ],
    closing: "Conversemos qué tipo de orden de corretaje te conviene.",
  },
  {
    key: "ubicacion-primero",
    topic: "comprar",
    title: "La ubicación no se remodela",
    hook: "Puedes cambiar la cocina, los pisos y la pintura. La ubicación, nunca.",
    points: [
      "Prioriza el entorno: conectividad, servicios y el tipo de barrio que buscas.",
      "Recorre el sector a distintas horas y días antes de decidir.",
      "Una propiedad bien ubicada es más fácil de vender o arrendar en el futuro.",
    ],
    closing: "Te ayudamos a comparar sectores con información clara.",
  },
  {
    key: "visitar-dos-veces",
    topic: "comprar",
    title: "Visita dos veces antes de ofertar",
    hook: "La primera visita enamora. La segunda muestra los detalles.",
    points: [
      "Ve a otra hora del día: cambian la luz, el ruido y el tránsito.",
      "Revisa humedad, ventanas, enchufes y presión del agua.",
      "Pregunta por los gastos comunes y por lo que incluyen.",
    ],
    closing: "Tomar una buena decisión requiere tiempo. Te acompañamos en cada visita.",
  },
  {
    key: "copropiedad",
    topic: "comprar",
    title: "En un departamento compras también un edificio",
    hook: "Al comprar un departamento entras a una comunidad con sus propias reglas.",
    points: [
      "Pide el reglamento de copropiedad y revisa qué permite (mascotas, arriendos, remodelaciones).",
      "Pregunta por el estado del edificio y por las mantenciones planificadas.",
      "Consulta cómo funciona la administración y cuánto son los gastos comunes.",
    ],
    closing: "Un buen edificio cuida el valor de tu propiedad.",
  },
  {
    key: "necesidad-vs-deseo",
    topic: "comprar",
    title: "Separa lo indispensable de lo deseable",
    hook: "Buscar la propiedad perfecta suele terminar en no encontrar ninguna.",
    points: [
      "Haz dos listas: lo que no puede faltar y lo que sería ideal.",
      "Piensa en los próximos años, no solo en hoy: espacio, trabajo, movilidad.",
      "Usa la lista para comparar opciones con criterio y no solo por la primera impresión.",
    ],
    closing: "Cuéntanos qué buscas y filtramos por ti.",
  },
  {
    key: "oferta-ordenada",
    topic: "comprar",
    title: "Una oferta clara se responde más rápido",
    hook: "Una oferta bien presentada dice tanto como el monto.",
    points: [
      "Formalízala por escrito con plazos claros.",
      "Define desde el inicio qué incluye la compra (estacionamiento, bodega, muebles).",
      "Ten resuelto el financiamiento antes de ofertar; tu banco o asesor financiero te orienta.",
    ],
    closing: "Preparamos la carta oferta contigo y la presentamos al propietario.",
  },
  {
    key: "arrendatario-confiable",
    topic: "arrendar",
    title: "Arrendar bien empieza por el proceso",
    hook: "El arriendo que más cuesta es el que se hizo sin un proceso ordenado.",
    points: [
      "Aplica los mismos criterios objetivos a todos los interesados.",
      "Revisa antecedentes con las autorizaciones que corresponden.",
      "Deja todo por escrito en un contrato claro.",
    ],
    closing: "Nos encargamos de la evaluación y del contrato de arriendo.",
  },
  {
    key: "inventario",
    topic: "arrendar",
    title: "El inventario evita discusiones",
    hook: "La entrega de un arriendo dura una hora. Un inventario bien hecho te ahorra meses de discusiones.",
    points: [
      "Registra con fotos el estado de cada espacio el día de la entrega.",
      "Anota medidores, llaves y controles entregados.",
      "Que ambas partes firmen el acta de entrega.",
    ],
    closing: "Al final del arriendo, se compara con lo mismo y no hay sorpresas.",
  },
  {
    key: "propiedad-lista",
    topic: "arrendar",
    title: "Una propiedad lista se arrienda antes",
    hook: "Cada mes vacío es un mes de arriendo que no vuelve.",
    points: [
      "Pinta, limpia y repara antes de publicar, no después de la primera visita.",
      "Fija un precio acorde a propiedades similares del sector.",
      "Ten disponibilidad para mostrar la propiedad en horarios flexibles.",
    ],
    closing: "Publicamos con fotos profesionales y coordinamos las visitas.",
  },
  {
    key: "trato-igualitario",
    topic: "arrendar",
    title: "Criterios objetivos, siempre",
    hook: "Elegir arrendatario es evaluar antecedentes, no personas.",
    points: [
      "Define antes de publicar qué requisitos pedirás, iguales para todos.",
      "No discrimines por condiciones personales: además de injusto, la ley lo prohíbe.",
      "Documenta la decisión con los mismos criterios aplicados a cada postulante.",
    ],
    closing: "Un proceso parejo protege al propietario y al arrendatario.",
  },
  {
    key: "corredor-valor",
    topic: "vender",
    title: "Qué hace un corredor por ti",
    hook: "Un corredor no solo publica avisos.",
    points: [
      "Valoriza la propiedad con información de mercado.",
      "Filtra a los interesados y coordina las visitas.",
      "Acompaña la negociación, la promesa y la escritura hasta la entrega.",
    ],
    closing: "Bull Haus: intermediación y gestión inmobiliaria en el sector oriente de Santiago y la V Región costa.",
  },
];

const HASHTAGS: Record<TipTopic, string[]> = {
  vender: ["#BullHausTeAsesora", "#VenderPropiedad", "#BienesRaíces", "#Santiago"],
  comprar: ["#BullHausTeAsesora", "#ComprarPropiedad", "#BienesRaíces", "#Santiago"],
  arrendar: ["#BullHausTeAsesora", "#Arriendo", "#BienesRaíces", "#Santiago"],
};

/** Texto del post de LinkedIn armado desde la biblioteca (lo aprueba una persona antes de publicar). */
export function linkedinPostText(tip: LinkedInTip): string {
  return [
    tip.hook,
    "",
    ...tip.points.map((p) => `• ${p}`),
    "",
    tip.closing,
    "",
    `${LINKEDIN_SERIES} · bullhaus.cl`,
    "",
    HASHTAGS[tip.topic].join(" "),
  ].join("\n");
}

export const SOCIAL_POST_STATUS_LABELS = {
  borrador: "Borrador",
  en_revision: "En revisión",
  aprobado: "Aprobado",
  publicado: "Publicado",
  rechazado: "Rechazado",
} as const;
