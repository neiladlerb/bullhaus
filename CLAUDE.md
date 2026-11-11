# CLAUDE.md, plataforma y agentes de IA para Bull Haus

Contexto completo en `docs/propuesta.md` (agente de WhatsApp), `docs/sistema-ia.md` (ingreso de propiedades, contenido, redes y voz) y `docs/plataforma.md` (web, back office, pipeline, KYC, facturación y control de gestión; su sección 6 es el orden de trabajo). Léelos antes de cualquier tarea.

## Qué es

Agente propio sobre WhatsApp Cloud API que atiende a los contactos de Bull Haus (corredora de Las Condes con web en Convecta, @bullhaus_propiedades en Instagram y BullHauspropiedades en Facebook): compradores, arrendatarios y propietarios. Responde con los datos de la ficha de cada propiedad y agenda visitas, tasaciones o llamadas con un corredor. Multi-tenant desde el principio. Monorepo TypeScript con pnpm: `apps/web` (web pública, Next.js), `apps/backoffice` (Next.js), `apps/api` (Fastify), `apps/worker` (BullMQ), `apps/voice` (agente de voz), `packages/*` (agent, whatsapp, calendar, properties, intake, content, social, crm, kyc, contracts, billing, analytics, db).

## Reglas que no se negocian

- El agente se presenta como asistente virtual de Bull Haus en el primer mensaje y lo reconoce si le preguntan.
- Máximo de rechazos configurable, 2 por defecto, aplicado en código en el worker.
- Palabras de baja (BAJA, STOP...) se procesan sin pasar por el modelo.
- `book_appointment` nunca agenda sin nombre y sin confirmación explícita del hueco por parte del contacto. Si se envía invitación por email, exige `email_confirmed = true`.
- Fuera de la ventana de 24 h solo plantillas aprobadas.
- Ningún dato de una propiedad (precio, superficie, condiciones, disponibilidad) que no esté en su ficha, y ninguna cifra ni condición general que no esté en la base de conocimiento. Solo se ofrecen propiedades con estado `disponible`.
- La dirección exacta (`address_private`) solo sale al confirmar una visita, nunca en `get_property` ni `search_properties`.
- El agente no negocia precios, no asesora sobre créditos ni temas legales, no pide documentos por chat y no pregunta ni filtra por condiciones personales (Ley 20.609).
- Fichas, descripciones, posts y presupuestos de campaña no se publican ni activan sin aprobación de una persona de Bull Haus.
- Los textos generados salen de la ficha aprobada, no del audio ni de las fotos. Un campo que el corredor no dijo queda vacío.
- Las fotos no se alteran de forma que cambien la propiedad. Amoblado virtual solo con etiqueta "Imagen referencial".
- Sin llamadas ni mensajes en frío. El agente de voz se presenta como asistente virtual y avisa de la grabación en la primera frase.
- KYC: los documentos de identidad y la biometría van a un almacenamiento privado aparte, solo los abre el rol de cumplimiento, cada acceso queda en `kyc_access_log`, nunca se mandan a Claude ni a ningún modelo y nunca aparecen en logs. Ninguna operación pasa a Promesa o Contrato sin KYC aprobado de todas las partes. Los agentes nunca piden documentos; solo envían el enlace al portal de KYC.
- Contratos (`docs/contratos.md`): solo desde plantillas con `approved_by_lawyer`; nunca se generan con KYC sin aprobar, con documentos obligatorios sin cargar o si el propietario inscrito no coincide con quien firma. Los datos legales salen de los certificados, no de la ficha comercial. Claude puede extraer campos de certificados de la propiedad (con fragmento de origen y confirmación humana campo a campo), pero no redacta cláusulas legales nuevas.
- Facturación: ningún documento tributario se emite sin aprobación del rol de finanzas, y siempre a través del proveedor de facturación electrónica, nunca directo al SII.
- La web no carga etiquetas de publicidad (Meta, Google Ads) hasta que la persona acepta las cookies.
- Datos en región UE. No registrar en logs el cuerpo de los mensajes en producción.

## Convenciones

- TypeScript estricto, sin `any`. Zod para validar entradas de webhook, de herramientas y filas de la planilla de propiedades.
- Tests con Vitest para cada herramienta, para el webhook y para la sincronización de propiedades. `pnpm test` debe pasar antes de cerrar una tarea.
- Evals de conversación en `evals/`; ejecutar `pnpm evals` tras tocar el prompt.
- Textos visibles para el usuario en español de Chile (departamento, arriendo, celular, gastos comunes, estacionamiento; nunca piso, alquiler ni móvil). Fechas dd/mm/aaaa, horas 24 h. Zona horaria por defecto America/Santiago.
- Precios en la moneda de la ficha con formato chileno: "UF 18.500", "$1.450.000". No convertir UF a CLP.
- Cada cambio en el prompt va con una entrada breve en `docs/cambios-prompt.md`.

## Comandos

- Node 22 portátil: `export PATH="/c/dev/tools/node-v22.23.4-win-x64:$PATH"` antes de pnpm (no hay Node instalado en el sistema).
- `pnpm db:start` levanta PostgreSQL local (puerto 5433, sin Docker). Debe quedar corriendo.
- `pnpm dev` levanta el back office en el puerto 3100 (api, worker y web llegarán en pasos siguientes).
- `pnpm db:migrate` aplica migraciones Prisma.
- `pnpm test` y `pnpm evals`.
