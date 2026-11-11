# Sistema IA de Bull Haus: paso a paso

Versión 1.0, 11/11/2026. Complementa `docs/propuesta.md` (agente de WhatsApp). Estado: borrador.

La web pública y el back office (que reemplaza al "panel interno" de este documento), con pipeline, KYC, facturación y control de gestión, están en `docs/plataforma.md`. El orden de trabajo completo está en su sección 6.

## 1. Qué es el sistema completo

Cinco piezas que comparten una sola base de propiedades, un solo panel y las mismas reglas:

| Pieza | Quién la usa | Qué hace |
|---|---|---|
| A. Ingreso de propiedades | Corredores de Bull Haus | Subir planillas, fotos y un audio describiendo la casa; el sistema arma la ficha y los textos |
| B. Estudio de contenido | Equipo de Bull Haus | Genera posts de venta y de captación con las plantillas de marca, para aprobar y publicar |
| C. Agente de redes | Automático, con aprobación humana | Publica en Instagram y Facebook, responde comentarios llevando a WhatsApp y lanza campañas click-to-WhatsApp |
| D. Agente de WhatsApp | Compradores, arrendatarios y propietarios | Atiende y agenda (ya descrito en `docs/propuesta.md`) |
| E. Agente de voz | Las mismas personas, por teléfono | Contesta llamadas, describe propiedades y agenda visitas |

```
            Corredor (audio, fotos, planilla)
                         |
                 A. Ingreso de propiedades
                         |
         Base de propiedades + fotos + descripciones   <-- única fuente de verdad
          /            |              |            \
  B. Estudio     C. Agente de     D. Agente de    E. Agente
  de contenido      redes          WhatsApp        de voz
          \            |              |            /
           Panel interno: aprobaciones, agenda, contactos, métricas
```

El orden importa: sin fichas buenas no hay posts ni agentes que puedan contestar sin inventar. Por eso se empieza por A.

Supuesto: "subir plantillas" cubre dos cosas, las planillas de propiedades (Excel o Google Sheets) y las plantillas de diseño de marca para los posts. Las dos están en el plan. [PENDIENTE: confirmar]

## 2. Reglas comunes a todas las piezas

1. Ningún texto, post ni respuesta usa un dato que no esté en la ficha aprobada o en la base de conocimiento. Lo que la IA no sabe, lo deja vacío y lo pregunta.
2. Nada se publica sin aprobación de una persona de Bull Haus: fichas, descripciones, posts y anuncios. La IA propone, Bull Haus aprueba. En una fase posterior se puede activar la publicación automática para tipos de post concretos.
3. Las fotos no se alteran de forma que cambien la propiedad (no se quitan grietas, no se cambian vistas ni se agrandan espacios). Se permite corregir luz, enderezar y recortar. Un amoblado virtual solo se usa con la etiqueta "Imagen referencial, amoblado virtual".
4. Toda pieza que habla con personas (WhatsApp, comentarios, voz) se presenta como asistente virtual de Bull Haus.
5. Sin envíos ni llamadas en frío. Solo se contacta a quien escribió, llamó o pidió que lo llamaran, y siempre hay forma de darse de baja (Ley 19.496, art. 28 B).
6. Ni textos ni anuncios segmentan o excluyen por condiciones personales (Ley 20.609).
7. Testimonios, cifras de ventas y casos ("vendimos en 30 días") solo con fuente y con permiso escrito del cliente.

## 3. Paso a paso

Cada paso termina con algo que Bull Haus puede usar. Las estimaciones son de una persona con Claude Code.

### Paso 1. Base de propiedades y carga de planillas (1 semana)

Objetivo: tener todas las propiedades de Bull Haus en el sistema, con su estado y sus fotos.

Qué se construye:

- Tabla `properties` (ya definida en la propuesta, sección 8) y nuevas tablas `property_media` (fotos y videos, orden, portada, origen) y `property_descriptions` (texto por canal y versión).
- Importación de planillas: el corredor sube un Excel o CSV en el panel, o se conecta la planilla de Google Sheets. Se valida fila a fila con Zod y se muestra qué filas entraron y cuáles no y por qué.
- Plantilla de planilla descargable desde el panel, con las columnas de la sección 7 de la propuesta, para que Bull Haus no invente su formato.
- Subida de fotos por propiedad (arrastrar desde el computador o desde el celular). Se guardan en Supabase Storage en varios tamaños.
- Carga inicial: la cartera publicada hoy en @bullhaus_propiedades. Se puede leer el feed de Instagram por la API de Meta para traer fotos y textos de cada post como borrador, y que un corredor complete lo que falte.

Listo cuando: Bull Haus ve su cartera en el panel, cada propiedad con fotos, estado y corredor asignado.

> Orden para Claude Code: Lee docs/propuesta.md y docs/sistema-ia.md. Añade al esquema Prisma property_media y property_descriptions según el paso 1. Implementa la importación de planillas Excel/CSV con validación Zod e informe de errores por fila, la plantilla descargable, la subida de fotos a Supabase Storage con tres tamaños y la importación del feed de Instagram de @bullhaus_propiedades como borradores. Tests de importación con filas mal formadas.

### Paso 2. Asistente del corredor: de un audio a la ficha y los textos (1,5 semanas)

Objetivo: el corredor recorre la casa, graba un audio contando cómo es, saca fotos y en minutos tiene la ficha y las descripciones listas para revisar.

Cómo lo usa el corredor (dos entradas, el mismo resultado):

1. Por WhatsApp: le manda al número de Bull Haus notas de voz y fotos. El sistema lo reconoce porque su celular está en la tabla de corredores, así que no lo atiende el agente de clientes sino el asistente del corredor. Responde: "Recibí 3 audios y 24 fotos de la casa de Los Dominicos. Te dejo el borrador en el panel. Me faltan: m² de terreno y gastos comunes".
2. Por el panel (en el celular): botón "Describir por voz", graba y sube.

Qué pasa por dentro:

1. Transcripción del audio a texto con un servicio de voz a texto que entienda bien el español de Chile. Claude no transcribe audio, así que va un proveedor aparte. Probar dos o tres (por ejemplo Deepgram, ElevenLabs Scribe, Google Speech) con 10 audios reales de corredores de Bull Haus y quedarse con el que menos se equivoque en números y nombres de comunas.
2. Extracción de la ficha con Claude (`claude-sonnet-5-5`, salida estructurada validada con Zod): operación, tipo, comuna, sector, m², dormitorios, baños, estacionamientos, bodega, orientación, año, estado, terminaciones, extras (piscina, quincho, logia...). Regla: si el corredor no lo dijo, el campo queda vacío. Cada dato guarda la frase del audio de la que salió, para que el corredor lo pueda comprobar.
3. Lectura de las fotos con Claude (visión): propone el orden del carrusel y la foto de portada, etiqueta cada foto (living, cocina, dormitorio principal, jardín...) y avisa de fotos movidas, oscuras o repetidas. No saca de las fotos datos de la ficha como m² o número de baños; como mucho sugiere "veo una piscina en las fotos, ¿la agrego a extras?".
4. Generación de textos por canal, todos a partir de la ficha ya revisada, no del audio:

| Texto | Uso | Largo aproximado |
|---|---|---|
| Descripción completa | Portal Inmobiliario, Toctoc, ficha en PDF | 150 a 250 palabras |
| Caption de Instagram y Facebook | Post de venta o arriendo | 60 a 120 palabras, con llamada a WhatsApp |
| Mensaje corto | Agente de WhatsApp y de voz | 2 o 3 frases |
| Guion de reel | Video vertical de 20 a 30 s | 4 a 6 escenas con texto en pantalla |
| Ficha PDF | Para mandar a interesados | Una página con fotos y datos |

5. Revisión en el panel: ficha a la izquierda con los campos dudosos marcados, textos a la derecha. El corredor corrige, aprueba y la propiedad pasa a `disponible`.

Estilo de los textos: español de Chile, sin "propiedad soñada", "oportunidad única" ni exclamaciones en cadena. Datos primero (comuna, m², dormitorios) y luego lo que la hace distinta, con las palabras que usó el corredor. Se arma una guía de estilo con 10 descripciones que Bull Haus considere buenas y se usa como ejemplos en el prompt.

Listo cuando: un corredor de Bull Haus pasa de audio y fotos a ficha aprobada en menos de 10 minutos de su tiempo, y en 20 propiedades de prueba ningún texto trae un dato que el corredor no haya dicho.

> Orden para Claude Code: Implementa packages/intake según el paso 2 de docs/sistema-ia.md: recepción de notas de voz y fotos por WhatsApp desde celulares de corredores (desviándolas del agente de clientes), transcripción con un adaptador de voz a texto intercambiable, extracción de la ficha con claude-sonnet-5-5 y salida estructurada validada con Zod guardando la frase de origen de cada campo, etiquetado y orden de fotos con visión, y generación de los cinco textos por canal solo a partir de la ficha aprobada. Pantalla de revisión en el panel. Evals con 20 audios de prueba que fallan si aparece un dato no dicho.

### Paso 3. Agente de WhatsApp de atención (3,5 semanas)

Es el plan de `docs/propuesta.md` (fases 1 a 8). Con los pasos 1 y 2 hechos, la fase de propiedades de esa propuesta ya está resuelta y el agente arranca con fichas completas. Se puede desarrollar en paralelo al paso 2 si hay dos personas.

### Paso 4. Estudio de contenido: plantillas de marca y posts (2 semanas)

Objetivo: que Bull Haus tenga cada semana una parrilla de posts lista para aprobar, con su marca, sin diseñar a mano.

Plantillas de diseño:

- Bull Haus sube su logo y 3 o 4 diseños de referencia. Colores y tipografía ya están definidos (magenta #EA2B94, gris carbón #3F3F3E, Raleway). A partir de eso se crean las plantillas en código (HTML que se convierte en imagen), así el sistema las rellena solo:
  - Portada de propiedad (foto, comuna, precio, dormitorios, m²).
  - Carrusel de propiedad (portada, 4 a 8 fotos, slide final con datos y "Escríbenos por WhatsApp").
  - "NUEVO VALOR" (precio anterior tachado y precio nuevo, solo si los dos están en el historial de la ficha).
  - "ARRENDADA" / "VENDIDA".
  - Post de captación (texto sobre fondo de marca o foto de una comuna).
  - Historia vertical con enlace a WhatsApp.
- Alternativa si Bull Haus ya diseña en Canva: usar sus plantillas de Canva a través de la API de Canva. [PENDIENTE: preguntar a Bull Haus qué usa hoy]

Tipos de post:

| Tipo | Para quién | Contenido | Se genera cuando |
|---|---|---|---|
| Venta o arriendo | Compradores y arrendatarios | Carrusel o reel de la propiedad con su caption | Una ficha pasa a `disponible` |
| Nuevo valor | Compradores | Precio anterior y nuevo | Cambia el precio en la ficha |
| Arrendada / vendida | Propietarios que miran | Prueba de que Bull Haus cierra operaciones | La ficha pasa a `arrendada` o `vendida` |
| Captación de propietarios | Dueños que quieren vender o arrendar | "¿Quieres arrendar tu depto en Providencia?", cómo trabaja Bull Haus, qué incluye, pasos para vender | Calendario semanal |
| Educativo | Ambos | Qué es el pie, cómo se calculan los gastos comunes, qué piden para arrendar | Calendario semanal, con temas aprobados |

Flujo:

1. Cada lunes el agente arma la parrilla de la semana: publicaciones pendientes de propiedades nuevas, cambios de precio, cierres y 2 o 3 posts de captación o educativos. Propone día y hora según cuándo interactúan más los seguidores de @bullhaus_propiedades (dato que da la API de Instagram).
2. Cada post llega al panel como borrador con imagen, caption, hashtags y fecha.
3. Alguien de Bull Haus aprueba, edita o descarta. Sin aprobación no se publica.

Prompts de captación: lo que Bull Haus hace y cómo lo hace, sin cifras ni resultados que no estén en la base de conocimiento. Si Bull Haus nos da casos reales con permiso ("arrendamos este depto en Ñuñoa en 12 días"), entran como dato y se pueden usar.

Listo cuando: Bull Haus aprueba una semana completa de posts en menos de 20 minutos.

> Orden para Claude Code: Implementa packages/content según el paso 4 de docs/sistema-ia.md: plantillas de marca en HTML renderizadas a imagen (portada, carrusel, nuevo valor, vendida/arrendada, captación, historia), generador de captions con claude-sonnet-5-5 que solo usa la ficha y la base de conocimiento, parrilla semanal automática y tabla posts con estados borrador, aprobado, programado, publicado y descartado. Pantalla de aprobación en el panel. Tests de que "NUEVO VALOR" no se genera sin precio anterior en el historial.

### Paso 5. Agente de redes: publicar, responder y campañas (2 semanas)

Objetivo: lo aprobado se publica solo, ningún comentario se queda sin respuesta y cada propiedad puede tener su anuncio click-to-WhatsApp.

Publicación:

- Instagram (API de publicación de contenido de la cuenta profesional de @bullhaus_propiedades) y página de Facebook de Bull Haus, con la API Graph de Meta. Imagen, carrusel, reel e historia.
- Programación desde la tabla `posts`; el worker publica a la hora y guarda el id del post para medir.
- Requisito: la cuenta de Instagram tiene que ser profesional y estar vinculada a la página de Facebook en el Business Manager de Bull Haus.

Comentarios y mensajes directos:

- El agente lee los comentarios de los posts. A "precio?", "info", "dónde queda" responde en público con una frase corta y lo invita a escribir por WhatsApp con el enlace; nunca da datos que no estén en la ficha.
- Comentarios negativos, quejas o cualquier cosa delicada: no responde, avisa al equipo.
- Mensajes directos de Instagram y Messenger: en este paso se conectan al mismo motor del agente de WhatsApp (sección "Fuera del MVP" de la propuesta).

Campañas click-to-WhatsApp:

- Desde el panel, botón "Promocionar" en una propiedad o en un post de captación. El agente propone segmentación por zona, texto y presupuesto diario; una persona de Bull Haus aprueba el presupuesto antes de que se active nada.
- Dos campañas de base siempre encendidas: captación de propietarios por comunas objetivo y venta y arriendo de las propiedades activas.
- Cada anuncio guarda su `ad_id` en la ficha, así el agente de WhatsApp sabe de qué propiedad viene el contacto.
- Nada de segmentar por edad, género u origen para propiedades. [PENDIENTE: verificar si Meta exige la categoría especial de anuncios de vivienda para Chile y qué limita]

Medición: por propiedad y por post, cuántos contactos de WhatsApp, cuántas visitas agendadas y cuánto costó cada una. Eso vuelve a la parrilla del paso 4 para repetir lo que funciona.

Listo cuando: un post aprobado se publica a su hora en Instagram y Facebook, los comentarios de consulta tienen respuesta en menos de 10 minutos y una campaña lanzada desde el panel genera conversaciones atribuidas a su propiedad.

> Orden para Claude Code: Implementa packages/social según el paso 5 de docs/sistema-ia.md: publicación en Instagram y Facebook con la API Graph de Meta desde la tabla posts, respuesta a comentarios de consulta con derivación a WhatsApp y aviso al equipo para los delicados, y creación de campañas click-to-WhatsApp con la Marketing API solo tras aprobación del presupuesto en el panel. Guarda ad_id en la propiedad. Tests con respuestas simuladas de la API de Meta.

### Paso 6. Agente de voz (3 semanas)

Objetivo: que quien llame a Bull Haus sea atendido a cualquier hora, pueda preguntar por una propiedad y salga con la visita agendada, igual que por WhatsApp.

Qué hace:

- Llamadas entrantes al número de Bull Haus: saluda como asistente virtual de Bull Haus, pregunta por qué propiedad llama o qué busca, responde con la ficha, agenda visita, tasación o llamada con un corredor y manda la confirmación por WhatsApp.
- Llamadas salientes solo a quien lo pidió: por ejemplo, alguien que escribió "llámenme" en WhatsApp, o confirmación de una visita agendada. Nunca listas frías.
- Derivación: si la persona lo pide o el tema es delicado, transfiere la llamada al corredor de turno; si no contesta, toma el recado y avisa.
- Corredor: también puede llamar al asistente para dictar una propiedad (la misma entrada del paso 2, por teléfono).

Cómo se construye:

| Pieza | Elección | Comentario |
|---|---|---|
| Canal | Llamadas de WhatsApp (API de llamadas de WhatsApp Business) como canal principal, y un número +56 en un proveedor de telefonía (Twilio, Vonage o similar) para quien llame por teléfono normal | Ver "Llamadas de WhatsApp en Chile" más abajo |
| Orquestación | LiveKit Agents, código propio | Alternativa más rápida de montar: Vapi o Retell, plataformas de agentes de voz |
| Voz a texto en tiempo real | El proveedor que gane la prueba del paso 2 | Mismo criterio: números y comunas bien entendidos |
| Cerebro | Claude, con las mismas herramientas del agente de WhatsApp | `claude-haiku-5-5` si la latencia de `claude-sonnet-5-5` se nota en la conversación |
| Texto a voz | Una voz en español latino natural, idealmente con acento chileno (ElevenLabs, Cartesia u otro) | Probar 3 voces con corredores de Bull Haus |

Llamadas de WhatsApp en Chile (revisado el 11/11/2026 en la documentación de Meta):

- Disponibles. Las llamadas que hace el usuario a la empresa funcionan en todos los países donde está la Cloud API. Las que hace la empresa al usuario también, salvo en Estados Unidos, Canadá, Egipto, Vietnam y Nigeria; Chile no tiene restricción.
- Costo: las llamadas que hace el usuario son gratis. Las que hace la empresa se cobran por minuto (en tramos de 6 segundos) según el país de destino y el volumen mensual, y desde el 01/04/2026 Meta factura en CLP. [PENDIENTE: tarifa para Chile en la tabla de precios de Meta]
- Conexión técnica: Meta permite conectar las llamadas por SIP, así que llegan a LiveKit igual que una llamada telefónica normal. El mismo agente atiende las dos.
- Requisito que puede frenar el arranque: el número de WhatsApp de Bull Haus tiene que tener un límite de mensajería de al menos 2.000 destinatarios únicos al día. Un número nuevo empieza por debajo y sube con el uso y la verificación del negocio. Para el piloto se puede empezar solo con llamadas por teléfono normal y activar WhatsApp cuando el número llegue a ese límite.
- Para llamar a un contacto, la empresa necesita su permiso, y ese permiso lo da solo el usuario:
  - Si el contacto llama a Bull Haus, el permiso queda dado automáticamente por 7 días (hay que activar la opción de devolución de llamadas en el número).
  - Si no, se le pide por WhatsApp. Como máximo se puede pedir una vez al día y dos veces por semana. Puede aceptar por 7 días o para siempre.
  - Si el contacto no contesta 4 llamadas seguidas, el permiso se revoca solo.
  - Máximo 100 llamadas conectadas al día por número.
- Encaja con nuestra regla de no llamar en frío: Meta no deja llamar sin permiso del usuario.

Reglas propias de la voz:

- Primera frase fija: "Hola, te habla el asistente virtual de Bull Haus. Esta llamada se graba para coordinar tu visita. ¿En qué te ayudo?" Si no quiere que se grabe, no se graba y se toma solo la nota.
- Frases cortas, una pregunta a la vez y confirmaciones explícitas de fecha y hora ("martes 17 de noviembre a las diez de la mañana, ¿confirmo?").
- Precios leídos como se dicen: "dieciocho mil quinientas UF".
- Objetivo de latencia: menos de un segundo entre que la persona termina de hablar y el agente empieza a responder. Si se interrumpe, se calla y escucha.
- La transcripción queda en la misma conversación del contacto en el panel, junto a sus mensajes de WhatsApp.

Listo cuando: en 30 llamadas de prueba con personas de Bull Haus haciendo de clientes, al menos 25 terminan con la cita bien agendada y ninguna con un dato inventado.

> Orden para Claude Code: Crea apps/voice según el paso 6 de docs/sistema-ia.md con LiveKit Agents: llamada entrante por SIP desde un número +56, voz a texto en streaming, Claude con las herramientas de packages/agent, texto a voz, aviso fijo de asistente virtual y grabación, transferencia al corredor y confirmación por WhatsApp al agendar. Las transcripciones se guardan como mensajes de la conversación del contacto. Evals de voz con 30 guiones.

### Paso 7. Métricas y mejora continua (permanente)

- Panel de resultados: contactos por canal, visitas agendadas, visitas realizadas, captaciones de propietarios, costo por visita en campañas, tiempo de primera respuesta.
- Revisión semanal con Bull Haus: 10 conversaciones de WhatsApp, 5 llamadas, los posts con mejor y peor resultado. Los ajustes de prompt van a `docs/cambios-prompt.md` y pasan los evals antes de subir.
- Cada caso real que Bull Haus autorice se añade a la base de conocimiento para que los posts de captación tengan pruebas reales.

## 4. Calendario resumido

| Semana | Paso | Qué tiene Bull Haus al final |
|---|---|---|
| 1 | 1. Base de propiedades | Cartera completa en el panel |
| 2 y 3 | 2. Asistente del corredor | Fichas y textos desde un audio |
| 2 a 5 | 3. Agente de WhatsApp (en paralelo si hay dos personas) | Atención 24/7 y visitas agendadas |
| 6 y 7 | 4. Estudio de contenido | Parrilla semanal de posts para aprobar |
| 8 y 9 | 5. Agente de redes | Publicación, comentarios y campañas |
| 10 a 12 | 6. Agente de voz | Llamadas atendidas y visitas agendadas por teléfono |
| Desde la 6 | 7. Métricas | Revisión semanal |

Con una sola persona, sumar unas 3 semanas por no poder paralelizar el paso 3.

## 5. Datos nuevos (además de la propuesta, sección 8)

```
property_media
  id, property_id, kind (foto | video), url, sizes jsonb, order int, is_cover bool,
  label (living | cocina | dormitorio | bano | jardin | piscina | fachada | vista | otro) null,
  quality_flags text[], source (panel | whatsapp | instagram), created_at

property_descriptions
  id, property_id, channel (completa | caption | corta | reel | pdf), body text,
  version int, status (borrador | aprobada | descartada), generated_from_fields jsonb,
  approved_by null, created_at

property_price_history
  id, property_id, price, currency, changed_at

intake_sessions
  id, property_id null, broker_user_id, channel (whatsapp | panel | telefono),
  audio_urls text[], transcript text, extracted jsonb, field_sources jsonb,
  status (procesando | para_revisar | aprobada), created_at

posts
  id, tenant_id, type (venta | nuevo_valor | cerrada | captacion | educativo),
  property_id null, format (imagen | carrusel | reel | historia), media_urls text[],
  caption text, scheduled_at, status (borrador | aprobado | programado | publicado | descartado),
  approved_by null, ig_media_id null, fb_post_id null, metrics jsonb, created_at

campaigns
  id, tenant_id, objective (captacion | venta_arriendo), property_id null, meta_campaign_id,
  ad_ids text[], daily_budget_clp, status, approved_by, created_at

calls
  id, lead_id null, direction (entrante | saliente), from_number, to_number,
  started_at, ended_at, recording_url null, recording_consent bool,
  transcript text, outcome (cita | recado | derivada | sin_resultado), created_at
```

## 6. Costos que hay que estimar antes de empezar

[PENDIENTE: pedir precios actuales y calcular con el volumen de Bull Haus]

- Claude API: por conversación de WhatsApp, por ficha generada y por minuto de llamada.
- Voz a texto y texto a voz: por minuto.
- Telefonía: número +56 y minutos.
- Llamadas de WhatsApp hechas por Bull Haus (las del contacto son gratis), según la tabla de Meta en CLP.
- Plataforma de voz si se elige Vapi o Retell en vez de LiveKit.
- Mensajes de plantilla de WhatsApp (recordatorios).
- Presupuesto de campañas en Meta, que lo pone Bull Haus.

## 7. Pendientes con Bull Haus

- [PENDIENTE: confirmar que "plantillas" son planillas de propiedades y diseños de posts]
- [PENDIENTE: logo, colores, tipografías y diseños de referencia]
- [PENDIENTE: si diseñan hoy en Canva]
- [PENDIENTE: 10 descripciones que les gusten, como guía de estilo]
- [PENDIENTE: 10 audios reales de corredores describiendo una propiedad, para probar la transcripción]
- [PENDIENTE: quién aprueba posts y presupuestos de campaña]
- [PENDIENTE: comunas objetivo para captar propietarios]
- [PENDIENTE: número de teléfono para el agente de voz y corredores de turno para transferir]
- [PENDIENTE: casos reales con permiso para posts de captación]
