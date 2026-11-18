# Agentes de IA para el marketing de Bull Haus

Análisis del 17/11/2026. Qué agentes hacen falta para que el marketing funcione solo, qué datos usa cada uno, qué sigue aprobando una persona, cuánto cuesta y en qué orden construirlos. Complementa `docs/sistema-ia.md` (el detalle de cada paso) y `docs/propuesta.md` (agente de WhatsApp).

## Resumen

"Automático" no quiere decir sin personas. Quiere decir que el sistema prepara todo y la persona solo aprueba con un clic. Las reglas de CLAUDE.md no cambian: nada se publica ni se gasta sin aprobación de Bull Haus, no hay mensajes en frío, y los textos salen de la ficha aprobada.

| # | Agente | Qué resuelve | ¿Usa IA? | Estado hoy |
|---|---|---|---|---|
| 1 | Atención por WhatsApp | Responde a compradores, arrendatarios y propietarios, y agenda visitas | Sí (Sonnet) | Prompt listo; falta conectar WhatsApp |
| 2 | Asistente del corredor | Del dictado a la ficha y la descripción | Opcional (Haiku y Sonnet) | Funciona sin IA; con clave usa Claude |
| 3 | Estudio de contenido | Posts, historias, captions y brochures con la marca | Sí, para textos | Brochures con diseñador listos; faltan captions y la parrilla semanal |
| 4 | Publicador | Publica en Instagram y Facebook lo aprobado, en el horario elegido | No (reglas) | Falta; hoy se descarga y se sube a mano |
| 5 | Seguimiento de leads | Recuerda, hace seguimiento y avisa al corredor cuando un lead se enfría | Poca (Haiku) | Compromisos y pipeline listos; falta el envío por WhatsApp |
| 6 | Captación de propietarios | Campañas para conseguir propiedades, con la tasación como gancho | Sí, para textos | Tasación e informe listos; faltan la campaña y la landing |
| 7 | Analista | Informe semanal: qué canal trae leads, costo por lead, qué mejorar | Sí (Sonnet, una vez por semana) | Control de gestión listo; falta el informe con recomendaciones |
| — | Tasación | Valor por comparables | **No** | Lista; falta sumar datos de mercado (sección 3) |

## 1. Lo que hay que tener antes

Sin esto, ningún agente puede hacer su trabajo de verdad:

1. **WhatsApp Cloud API** (sección 4). Hoy los envíos abren el WhatsApp del corredor con el texto listo y él lo manda. Para que el sistema envíe y reciba, hace falta la cuenta de Meta.
2. **Clave del modelo** (`ANTHROPIC_API_KEY` y `LLM_PROVIDER=anthropic` en Vercel). Sin clave, el dictado y la tasación funcionan con reglas, pero el agente de WhatsApp y los textos no.
3. **Instagram y Facebook conectados por API** (cuenta profesional de Instagram unida a la página de Facebook, con una app de Meta). Hace falta para el publicador y para leer métricas.
4. **Datos de mercado** para las tasaciones (sección 3).

## 2. Cada agente

### Agente 1. Atención por WhatsApp

- **Qué hace:** responde con los datos de la ficha, propone horarios libres de la agenda del corredor y agenda la visita. Si le escribe un propietario, ofrece la tasación.
- **Se activa:** cuando alguien escribe al número de Bull Haus (desde un aviso, la web, un brochure o Instagram).
- **Usa:** fichas disponibles, agenda (`freeSlots`), base de conocimiento y el lead en el CRM.
- **Aprueba una persona:** nada en la conversación normal. Escala al corredor si se trata de una oferta de precio, un reclamo, temas legales o de crédito, o si el contacto lo pide (tabla de límites en `docs/prompt-agente-whatsapp.md`).
- **Reglas en código:** se presenta como asistente virtual, máximo 2 rechazos, baja sin modelo (BAJA, STOP), nunca agenda sin nombre y confirmación, y la dirección exacta solo sale al confirmar.
- **Costo:** ~US$ 0,14 por conversación de unos 10 turnos con Sonnet (precios.md, 13/11/2026). Con 300 conversaciones al mes son ~US$ 42, más los mensajes de WhatsApp (sección 4).

### Agente 2. Asistente del corredor

- **Qué hace:** del dictado propone los datos de la ficha con su frase de origen y redacta la descripción desde la ficha revisada. Ya está en el back office.
- **Siguiente paso:** recibir notas de voz por WhatsApp del corredor (reconocido por su celular) y generar los textos por canal: caption, mensaje corto y guion de reel.
- **Aprueba una persona:** cada campo y cada texto.
- **Costo:** con Haiku para extraer y Sonnet para redactar, menos de US$ 0,05 por propiedad.

### Agente 3. Estudio de contenido

- **Qué hace:** cada lunes deja lista una parrilla de la semana:
  - propiedades nuevas,
  - nuevos valores (solo con el precio anterior en el historial),
  - vendidas y arrendadas,
  - un post de captación y uno educativo.
  
  Cada pieza lleva su imagen (las plantillas del diseñador de brochures) y su caption.
- **Usa:** fichas aprobadas, historial de precios, cambios de estado y los temas aprobados.
- **Aprueba una persona:** cada pieza, en una pantalla con todo lo de la semana (aprobar, corregir o descartar).
- **Costo:** ~15 piezas por semana con Sonnet, menos de US$ 2 al mes.

### Agente 4. Publicador

- **Qué hace:** publica en Instagram y Facebook lo que se aprobó, a la hora elegida, y registra el enlace del post. No escribe nada: solo publica lo aprobado.
- **Necesita:** la API de Instagram (Graph API) con permiso de publicación y una revisión de la app por Meta.
- **Costo:** sin IA. Corre en el worker o en n8n.

### Agente 5. Seguimiento de leads

- **Qué hace:** cuando un lead no responde o se vence un compromiso, prepara el siguiente mensaje y avisa al corredor. Dentro de las 24 h responde libre; fuera de ese plazo, solo con una plantilla aprobada por Meta, y solo a quien dio su contacto (nunca en frío). Usa la apertura de brochures como señal ("abrió el brochure 3 veces: llámalo hoy").
- **Aprueba una persona:** los textos de las plantillas, una vez. Al principio también cada envío; después, si Bull Haus quiere, los envíos de plantillas de utilidad (confirmar visita, recordatorio) pueden ir solos.
- **Costo:** casi todo son reglas. Haiku solo para clasificar respuestas. Los mensajes de WhatsApp son el costo principal.

### Agente 6. Captación de propietarios

- **Qué hace:** arma campañas para propietarios ("¿Cuánto vale tu casa en Las Condes?") que llevan a una página donde el propietario pide su tasación. El corredor prepara el informe en el back office y lo comparte.
- **Aprueba una persona:** la campaña, el presupuesto en Meta Ads y cada informe.
- **Costo:** el presupuesto de anuncios lo fija Bull Haus. Se registra el costo por lead real de cada campaña.

### Agente 7. Analista

- **Qué hace:** cada lunes lee el control de gestión y escribe un resumen corto: leads por canal, costo por lead, brochures que más convierten, propiedades con muchas visitas y sin ofertas (posible precio alto), y tres recomendaciones. Solo sugiere; no cambia precios ni campañas.
- **Costo:** una llamada por semana a Sonnet, menos de US$ 1 al mes.

### La tasación no es un agente de IA

El valor sale de un cálculo: la mediana del precio por m² de comparables. Así cada número se puede revisar. Lo que sí cambió hoy: el corredor puede agregar **ajustes por características de la propiedad** (estado de conservación, remodelación, vista, ruido...). Cada ajuste lleva un porcentaje y una explicación, mueve el valor y queda escrito en el informe. Tope: 20 % por ajuste y 30 % en total.

## 3. Datos de mercado para tasar

### ¿Hay una base pública de precios reales de venta?

No hay una base oficial y abierta con el precio de cada compraventa:

- El SII entrega cada trimestre al Banco Central las transacciones de viviendas, pero lo público es solo el índice agregado de precios de vivienda.
- Los Conservadores de Bienes Raíces registran cada compraventa, pero se consultan propiedad por propiedad y con pago.

Lo que sí existe, con datos reales de compraventas:

| Fuente | Qué trae | Acceso | Costo (17/11/2026, sin IVA) |
|---|---|---|---|
| **Data Inmobiliaria** (datainmobiliaria.cl) | Compraventas desde 1998 con datos del SII y los CBR, por rol y por zona, más avalúos y avisos de portales | Web gratis; API REST en el plan Oficina | Oficina $99.990/mes (5 cuentas, 600 créditos de API al mes) |
| DATABAM (databam.cl) | Base de transacciones de las 26 comunas del CBR de Santiago | Pago | Por cotizar |
| Banco Central | Índice de precios de vivienda por zona | Gratis | Solo agregado, sirve de contexto |

**Recomendación:** contratar el plan con API de Data Inmobiliaria y sumarlo como cuarta fuente de comparables. Son precios de cierre reales, que es justo lo que le falta hoy a la tasación. Antes hay que revisar sus términos, sobre todo si los datos se pueden mostrar en informes a clientes y si se pueden usar en un servicio que se venda a otras corredoras.

### Portal Inmobiliario y otros portales

- Portal Inmobiliario es de Mercado Libre, y Mercado Libre tiene canales oficiales:
  - la **API de Inmuebles** (sobre todo para publicar y recibir consultas),
  - un **conector oficial de búsqueda** de propiedades para agentes de IA, con acceso de solo lectura y hasta 50 resultados por búsqueda.
  
  Son la vía permitida y conviene probarlas primero. Con eso, los avisos de portales entrarían a la tasación sin copiarlos a mano.
- **Scraping** (descargar los avisos de forma automática sin permiso):
  - **Condiciones de uso:** los portales suelen prohibirlo. Mercado Libre bloquea activamente los robots y limita cuántas páginas se pueden recorrer por búsqueda.
  - **Ley de propiedad intelectual (17.336):** protege las bases de datos.
  - **Datos personales:** desde el 01/12/2026 rige la Ley 21.719. Los avisos traen nombres y teléfonos de corredores y particulares, que son datos personales.
  - **Jurisprudencia:** no encontré fallos chilenos sobre scraping. El riesgo no está tanto en mirar avisos públicos como en guardarlos de forma masiva y, sobre todo, en **venderlos**.
- **Precio publicado no es precio de venta.** Los portales muestran lo que el propietario pide, no lo que se pagó. Para tasar sirven como complemento de los cierres, no como reemplazo.

### El motor de datos como producto aparte

Vender tasaciones o datos de mercado a otras corredoras tiene sentido, y la plataforma ya es multi-tenant. Pero el producto que se vende debería apoyarse en datos que Bull Haus pueda usar y revender:

1. su propio historial de cierres,
2. una fuente con licencia que permita revenderla (Data Inmobiliaria u otra; hay que negociarlo con ellos),
3. los canales oficiales de los portales.

Un motor de scraping de portales para revender sus datos es la opción con más riesgo legal y comercial (bloqueos, reclamos de Mercado Libre, Ley 21.719). **Mi recomendación es no construirlo sin un informe de un abogado.** Si después de esa revisión se decide hacerlo, el motor debería:

- respetar `robots.txt` y un ritmo bajo de consultas;
- guardar solo los datos del inmueble (comuna, sector, tipo, m², dormitorios, precio, fecha y enlace), nunca nombres ni teléfonos;
- conectarse como una fuente más de comparables, sin mezclarse con el resto del sistema.

## 4. WhatsApp de verdad

**Lo que tiene que hacer Bull Haus** (son cuentas a su nombre; yo no puedo crearlas):

1. Una cuenta de Meta Business verificada a nombre de Bull Haus.
2. Un número de teléfono **dedicado**, que no esté en uso en la app de WhatsApp.
3. Una app de Meta con el producto WhatsApp y un usuario del sistema con su token permanente.
4. Cargar en Vercel `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` y `WHATSAPP_VERIFY_TOKEN`, y registrar la URL del webhook que yo te indique.
5. Aprobar en Meta las plantillas que propongo:
   - confirmación de visita y recordatorio de visita (utilidad),
   - envío de brochure y seguimiento (marketing).

**Lo que construyo:**

- envío y recepción por la Cloud API, con el webhook validado;
- el agente 1 conectado al número;
- ventana de 24 h y plantillas fuera de ella;
- BAJA y STOP sin pasar por el modelo;
- "Enviar por WhatsApp" desde el brochure y la agenda, enviado por el sistema y registrado en el CRM, en vez de abrir el WhatsApp del corredor;
- ningún mensaje a quien no dio su contacto.

**Costos por mensaje** (precios.md, 13/11/2026; confirmar en la tabla de Meta):

| Tipo de mensaje | Costo aproximado |
|---|---|
| Marketing | US$ 0,09 a 0,11 |
| Utilidad | US$ 0,02 |
| Respuesta dentro de 24 h | ~US$ 0,02, con posible franquicia de 1.000 al mes |

## 5. Orden de construcción y costo mensual

| Orden | Qué | Costo mensual aproximado |
|---|---|---|
| 1 | WhatsApp real y agente de atención (agentes 1 y 5) | US$ 42 de modelo con 300 conversaciones, más los mensajes de WhatsApp |
| 2 | Datos de cierre de Data Inmobiliaria en la tasación | $99.990 + IVA |
| 3 | Estudio de contenido y publicador (agentes 3 y 4) | Menos de US$ 5 |
| 4 | Captación de propietarios con tasación (agente 6) | Presupuesto de Meta Ads |
| 5 | Analista semanal (agente 7) | Menos de US$ 1 |
| 6 | Notas de voz por WhatsApp al asistente del corredor (agente 2) | Transcripción por definir |

Los montos de modelo suponen precios de la API de Anthropic del 13/11/2026 y no incluyen el hosting (Vercel y Supabase), que ya se paga.

## 6. Decisiones de Bull Haus

1. Crear la cuenta de Meta Business y el número dedicado para WhatsApp.
2. Contratar o no el plan con API de Data Inmobiliaria, después de revisar sus términos.
3. Consultar a un abogado antes de cualquier scraping de portales, sobre todo si se piensa vender el servicio.
4. Cargar la clave del modelo en Vercel cuando se quiera activar la IA (agentes 1, 3, 6 y 7).

## Fuentes

- Banco Central de Chile, Índice de Precios de Vivienda: https://www.bcentral.cl/documents/33528/133329/bcch_archivo_096499_es.pdf
- Data Inmobiliaria: https://datainmobiliaria.cl/ y nota de G5 Noticias (15/04/2026): https://g5noticias.cl/2026/04/15/data-inmobiliaria-la-plataforma-gratuita-que-democratiza-el-acceso-a-la-inteligencia-inmobiliaria-en-chile/
- DATABAM: https://databam.cl/
- Mercado Libre, API de Inmuebles: https://developers.mercadolibre.com.ar/introduccion-guia-de-inmuebles
- Conector de búsqueda de Mercado Libre Inmuebles: https://agentman.ai/agentskills/connections/mcp-server/mercado-libre-inmuebles
- Ley 21.719 (BCN): https://www.bcn.cl/leychile/navegar?idNorma=1209272
- Resumen sobre scraping y ley chilena (fuente no oficial, usar con cautela): https://isitlegaldb.pages.dev/is-web-scraping-legal-chile
