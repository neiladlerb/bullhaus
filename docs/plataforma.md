# Plataforma Bull Haus: web y back office

Versión 1.0, 11/11/2026. Complementa `docs/propuesta.md` (agente de WhatsApp) y `docs/sistema-ia.md` (agentes de IA). Estado: borrador.

Este documento suma dos cosas al sistema: una web pública de Bull Haus hecha por nosotros (hoy tienen www.bullhaus.cl sobre la plataforma Convecta) y un back office que reemplaza al "panel interno" de los otros dos documentos. Desde el back office se manejan los agentes, las propiedades, el pipeline, la facturación, el KYC de vendedores y compradores y el control de gestión de la web, Meta Ads y Google Ads.

## 1. Mapa general

```
                 Web pública (bullhaus.cl)          Instagram / Facebook        Teléfono
                 propiedades, captación,         posts, anuncios,           llamadas
                 blog, privacidad                comentarios
                        |                              |                       |
                        +-------------+----------------+-----------+-----------+
                                      |                            |
                              Agente de WhatsApp            Agente de voz
                                      |                            |
                       +--------------+----------------------------+--------------+
                       |                        Back office                         |
                       |  Agentes IA | Propiedades | Pipeline | KYC | Facturación   |
                       |  Contenido y redes | Control de gestión (web, Meta, Google)|
                       +------------------------------------------------------------+
                                      |
                PostgreSQL + almacenamiento de archivos (fotos públicas, KYC privado)
                                      |
        Proveedores: Meta (WhatsApp, Graph, Marketing API), Google Ads API, GA4,
        Cal.com, facturación electrónica certificada por el SII, verificación de identidad
```

Todo comparte la misma base de datos. Una propiedad aprobada en el back office aparece en la web, la usan los agentes y se puede promocionar en Meta y Google sin volver a cargarla.

## 2. Web pública

Objetivo: que Bull Haus tenga una web conectada a su propia base de propiedades y a los agentes, que capte propietarios y que mida cada contacto hasta el cierre.

Punto de partida: hoy www.bullhaus.cl corre sobre Convecta, que también les da (probablemente) la carga de propiedades y la publicación en portales. Hay tres caminos y hay que elegir con Bull Haus:

| Opción | Qué implica | Cuándo conviene |
|---|---|---|
| A. Reemplazar | Nuestra web en el mismo dominio; las propiedades se cargan en nuestro back office y se deja Convecta | Si Convecta solo les da la web y no la publicación en portales |
| B. Convivir | Se mantiene Convecta como fuente de propiedades y web; nuestro back office importa su cartera (exportación o API de Convecta, si existe) y los agentes la usan | Si dependen de Convecta para portales o para su operación diaria |
| C. Migrar por etapas | Primero B; cuando el back office cubra lo que hace Convecta, pasar a A | Recomendado: no corta la operación y no depende de que Convecta abra datos |

[PENDIENTE: qué contrata Bull Haus a Convecta, si pueden exportar su cartera y si tienen API]

Se conserva el código de propiedad que ya usan (por ejemplo "109.751") para que los avisos, la web y los agentes hablen del mismo código. Los diseños siguen la identidad actual: magenta #EA2B94, gris carbón #3F3F3E, Raleway.

Páginas:

| Página | Contenido |
|---|---|
| Inicio | Propiedades destacadas, buscador, bloque "¿Quieres vender o arrendar tu propiedad?" |
| Propiedades | Listado con filtros: operación, tipo, comuna, precio en UF o CLP, dormitorios, baños, estacionamientos |
| Ficha de propiedad | Fotos, datos de la ficha, descripción aprobada, mapa del sector (aproximado, sin dirección exacta), botón de WhatsApp, botón "Agendar visita", ficha PDF |
| Vende o arrienda con Bull Haus | Cómo trabaja Bull Haus, qué incluye, formulario para propietarios que pide tipo, comuna y contacto, y agenda una tasación |
| Comunas | Una página por comuna donde Bull Haus opera, con sus propiedades. Ayudan a aparecer en Google ("departamento en arriendo en Las Condes") |
| Blog | Los posts educativos del estudio de contenido convertidos en artículos |
| Nosotros y contacto | Equipo de corredores, horario, WhatsApp |
| Privacidad, términos y cookies | Política de privacidad exigida por la Ley 21.719, que además necesitan el agente de WhatsApp y el de voz |

Conexión con los agentes:

- El botón de WhatsApp de cada ficha abre el chat con un texto ya escrito que incluye el código de la propiedad ("Hola, me interesa la propiedad MK-014"). El agente de WhatsApp lee el código y sabe por cuál escribe, igual que con los anuncios.
- El formulario de propietarios crea el contacto en el pipeline de captación y el agente de WhatsApp le escribe en menos de un minuto. Solo si la persona marcó que quiere que la contacten por WhatsApp, porque es ella la que inicia.
- "Agendar visita" usa los mismos huecos de Cal.com que los agentes.

Medición:

- Google Analytics 4, etiqueta de Google Ads y píxel de Meta, más la API de conversiones de Meta y las conversiones mejoradas de Google desde el servidor, para no perder datos por bloqueadores.
- Eventos: `ver_propiedad`, `click_whatsapp`, `formulario_propietario`, `visita_agendada`.
- Las etapas que pasan fuera de la web (visita realizada, reserva, cierre) se mandan de vuelta a Meta y Google como conversiones offline desde el back office. Así las campañas aprenden a buscar gente que cierra, no solo gente que hace clic.
- Banner de cookies con aceptar o rechazar. Las etiquetas de publicidad no se cargan hasta que la persona acepta.

Técnica: Next.js con renderizado en el servidor y datos estructurados de schema.org para cada propiedad, sitemap automático e imágenes optimizadas. La web lee solo propiedades con `estado = disponible` y `publicar_web = true`.

[PENDIENTE: dominio (¿bullhaus.cl?), si Bull Haus quiere textos propios en "Nosotros" y fotos del equipo]

## 3. Back office

Una sola aplicación web con acceso por roles. Funciona en el celular, porque los corredores la usan en terreno.

### 3.1 Usuarios y roles

| Rol | Ve y hace |
|---|---|
| Administrador | Todo, incluidos usuarios, ajustes y presupuestos |
| Corredor | Sus propiedades, sus contactos, su pipeline y su agenda. Toma conversaciones de los agentes |
| Marketing | Contenido, redes, campañas y control de gestión. No ve KYC ni facturación |
| Finanzas | Facturación, cobros y liquidación de comisiones |
| Cumplimiento | KYC y alertas de prevención de lavado de activos. Es el único rol que abre documentos de identidad |

Cada acción queda en `audit_log`. El acceso a un expediente de KYC queda registrado aparte, con quién, cuándo y qué abrió.

### 3.2 Agentes IA

Una sección por agente: WhatsApp, voz, redes y asistente del corredor.

- Encender o apagar, y horario en que atiende cada uno.
- Ajustes: nombre del asistente, aviso de asistente virtual, límite de rechazos, palabras de baja, reglas de derivación, duraciones de visita y antelación mínima.
- Base de conocimiento editable por Bull Haus: requisitos de arriendo, comisiones si las quieren decir, zonas, horarios, casos con permiso.
- Conversaciones en vivo de todos los canales en una sola bandeja, con "Tomar conversación" y "Devolver al agente".
- Calidad: resultado de los evals, conversaciones marcadas por el filtro de salida y bajas de la semana.
- Costo por agente y por conversación.

El prompt no se edita desde el back office. Un cambio de prompt pasa por desarrollo, `docs/cambios-prompt.md` y los evals. Bull Haus controla los ajustes y la base de conocimiento, que es lo que cambia el día a día.

### 3.3 Propiedades

Es lo descrito en los pasos 1 y 2 de `docs/sistema-ia.md` (planillas, fotos, ficha por audio, descripciones por canal), más:

- Mandato o "orden de corretaje" de cada propiedad: propietario, tipo (exclusivo o no), comisión pactada, fecha de firma y de vencimiento, archivo firmado. El back office avisa 15 días antes de que venza.
- Interruptor "Publicar en la web" y "Publicar en portales".
- Historial de precio (alimenta los posts de "NUEVO VALOR").
- Métricas por propiedad: visitas a la ficha web, contactos por canal, visitas realizadas, días publicada.

### 3.4 Pipeline

Dos tableros tipo kanban, con tareas, notas y recordatorios en cada tarjeta. La conversación con los agentes se ve dentro de la tarjeta.

Compradores y arrendatarios:

```
Nuevo -> Contactado -> Visita agendada -> Visita realizada -> Oferta -> Reserva
      -> Promesa (venta) / Contrato (arriendo) -> Escritura / Entrega -> Cerrado
                                                                     \-> Perdido (con motivo)
```

Propietarios (captación):

```
Nuevo -> Tasación agendada -> Tasación realizada -> Propuesta enviada -> Mandato firmado
      -> Propiedad publicada -> Cerrado
                             \-> Perdido (con motivo)
```

- Los agentes mueven las tarjetas solos hasta "Visita agendada" o "Tasación agendada". Desde ahí las mueve el corredor.
- Al llegar a "Reserva" se crea una operación (`deal`) que une propiedad, vendedor o arrendador, comprador o arrendatario, corredores que participan y su reparto de comisión. Esa operación dispara el KYC (3.5) y, al cerrar, la factura (3.6).
- Vistas: por corredor, por propiedad, por origen (web, Meta, Google, Instagram orgánico, referido) y embudo con tasas de paso entre etapas.

### 3.5 KYC de vendedores y compradores

Por qué es obligatorio y no un extra: la Ley 19.913 obliga a quienes se dedican a la gestión inmobiliaria a informar a la Unidad de Análisis Financiero (UAF), y los corredores de propiedades son de los sujetos obligados más fiscalizados. La Circular N° 62 de la UAF, vigente desde el 01/06/2025, fija las instrucciones de debida diligencia, beneficiario final y registros, y exige conservar los registros al menos 5 años. [PENDIENTE: confirmar con un abogado si Bull Haus está inscrita en la UAF, quién es su oficial de cumplimiento y si tiene manual de prevención]

Qué hace el módulo:

1. Al crear una operación, el sistema manda a cada parte (vendedor, comprador, arrendador, arrendatario) un enlace seguro al portal de KYC. Nunca se piden documentos por WhatsApp ni por el agente de voz; el agente solo envía el enlace.
2. La persona, desde su celular:
   - Persona natural: RUT, foto del carnet por ambos lados, selfie con prueba de vida, domicilio, profesión o actividad, nacionalidad, estado civil y régimen patrimonial (solo quien firma contratos, porque lo exigen las plantillas de `docs/contratos.md`), declaración de persona expuesta políticamente (PEP) y declaración de origen de los fondos (compradores).
   - Persona jurídica: RUT de la empresa, escritura y vigencia, representante legal con su propio KYC, y beneficiarios finales (quienes tienen 10 % o más o el control). [PENDIENTE: confirmar umbral vigente en la Circular 62]
3. Verificación automática con un proveedor especializado (por ejemplo Truora, MetaMap o Sumsub, a comparar por precio y por calidad con cédulas chilenas): que el carnet sea auténtico y esté vigente, que la selfie coincida y que la persona esté viva frente a la cámara.
4. Revisión de listas: listas del Consejo de Seguridad de la ONU, PEP y otras que exija la UAF.
5. Puntaje de riesgo según el enfoque de Bull Haus: tipo de cliente, país, monto de la operación, forma de pago, PEP. Riesgo alto pide debida diligencia reforzada (más documentos y aprobación de la persona de cumplimiento).
6. Aprobación o rechazo por la persona de cumplimiento, con nota. Ninguna operación pasa a "Promesa" o "Contrato" sin KYC aprobado de todas las partes.
7. Alertas de operación inusual para que cumplimiento evalúe si corresponde un reporte de operación sospechosa a la UAF. El sistema avisa; la decisión y el envío los hace la persona.
8. Conservación de 5 años desde que termina la relación y borrado después, con registro.

Reglas de datos:

- La biometría (selfie, prueba de vida) es un dato sensible para la Ley 21.719: consentimiento expreso y aparte, cifrado, y acceso solo para el rol de cumplimiento.
- Los documentos de KYC van a un almacenamiento privado separado del de fotos, con enlaces que caducan en minutos.
- Ningún documento de KYC se manda a Claude ni a ningún modelo de IA, y no aparece en logs. Lo procesa solo el proveedor de verificación.
- La evaluación de arrendatarios (liquidaciones de sueldo, antecedentes comerciales) es otro proceso, con su propio consentimiento y su propia finalidad, y nunca usa condiciones personales (Ley 20.609). [PENDIENTE: definir con Bull Haus qué piden hoy]

### 3.5 bis Contratos y documentos legales de la propiedad

Orden de corretaje, carta oferta, contrato de arriendo y minuta de promesa se generan desde plantillas aprobadas por el abogado de Bull Haus, con los datos del KYC aprobado y de los certificados de la propiedad (dominio vigente, hipotecas y gravámenes, avalúo fiscal, etc.). Todo el detalle, la lista de documentos que hay que cargar y las plantillas están en `docs/contratos.md` y `docs/contratos/`.

### 3.6 Facturación

Qué se factura: la comisión de corretaje a cada parte según el mandato y la operación (por ejemplo, al vendedor y al comprador), y en arriendos la comisión de arriendo. Si Bull Haus administra propiedades, también la comisión mensual de administración. [PENDIENTE: si Bull Haus administra arriendos; cobrar la renta y pagar al propietario es un módulo grande que no entra en esta versión]

Cómo:

- Emisión de documentos tributarios electrónicos a través de un proveedor de facturación electrónica conectado al SII (por ejemplo OpenFactura, Bsale, LibreDTE o el que ya use Bull Haus), por API. El back office no habla directo con el SII.
- Documentos: factura electrónica y nota de crédito para anulaciones o descuentos. El tipo exacto depende del régimen tributario de Bull Haus: por regla general la comisión de corretaje lleva IVA desde la Ley 21.420 (servicios gravados desde el 01/01/2023), pero hay que confirmarlo con su contador. [PENDIENTE: razón social, giro y régimen de Bull Haus, y qué sistema usa hoy]
- Flujo: al pasar una operación a "Escritura / Entrega" el sistema arma el borrador de factura con los datos de la operación y del cliente (ya verificados en el KYC). Finanzas lo revisa y lo emite. Ningún documento se emite sin esa aprobación.
- Cobro: estado de cada factura (emitida, enviada, pagada, vencida), recordatorio por email y, si Bull Haus quiere, enlace de pago (Webpay, Flow o Mercado Pago). Conciliación manual al principio y por cartola bancaria después.
- Comisiones de corredores: liquidación mensual por corredor según el reparto de cada operación cerrada y pagada.
- Exportación a la contabilidad de Bull Haus (planilla o integración con su software contable).

### 3.7 Control de gestión: web, Meta Ads y Google Ads

Un tablero con el embudo completo y el costo de cada etapa.

Fuentes:

| Fuente | Cómo se lee | Qué trae |
|---|---|---|
| Web | API de datos de GA4 | Visitas, propiedades más vistas, clics a WhatsApp, formularios |
| Meta Ads | Marketing API (Insights) | Gasto, impresiones, clics, conversaciones iniciadas, costo por conversación, por campaña y por anuncio |
| Google Ads | API de Google Ads | Gasto, clics, conversiones, palabras clave, por campaña |
| Instagram y Facebook orgánico | API Graph | Alcance, interacción y seguidores por post |
| Back office | Base propia | Contactos, visitas, tasaciones, mandatos, reservas, cierres y comisión facturada |

Lo que muestra:

- Embudo: impresiones → clics → contactos → visitas → ofertas → cierres → comisión facturada, filtrable por fuente, campaña, propiedad, comuna y corredor.
- Costo por contacto, por visita realizada, por mandato captado y por cierre.
- Retorno de la inversión publicitaria calculado con la comisión facturada, no con clics.
- Comparación semana contra semana y alertas: una campaña que gasta sin generar contactos en 3 días, una propiedad con muchas visitas a la ficha y ninguna visita agendada, un número de WhatsApp cuya calidad baja.

Atribución: cada contacto guarda su origen (`ad_id` de Meta, `gclid` de Google, UTM de la web, código de propiedad). Así el cierre se puede atribuir a la campaña que lo trajo.

Gestión de campañas desde el back office:

- Meta: lo descrito en el paso 5 de `docs/sistema-ia.md` (click-to-WhatsApp por propiedad y de captación).
- Google: campañas de búsqueda por comuna y tipo ("arriendo departamento Providencia", "corredora de propiedades Vitacura") y de captación de propietarios ("vender mi casa La Reina"), con destino a la ficha o a la página de captación de la web.
- El agente propone campaña, textos y presupuesto; una persona de Bull Haus aprueba el presupuesto antes de que se active nada.
- Requisitos: cuenta publicitaria de Meta de Bull Haus con nuestro acceso; cuenta de Google Ads con acceso de administrador para nosotros, y un token de desarrollador aprobado por Google para usar su API (la aprobación tarda, hay que pedirlo al inicio). [PENDIENTE: verificar si Meta y Google aplican en Chile restricciones de anuncios de vivienda]

## 4. Datos nuevos

Además de los de `docs/propuesta.md` (sección 8) y `docs/sistema-ia.md` (sección 5):

```
clients
  id, tenant_id, kind (natural | juridica), rut unique per tenant, name, email, phone,
  address, activity, lead_id null, created_at

client_relations                  -- beneficiarios finales y representantes
  id, company_client_id, person_client_id, role (representante | beneficiario_final), ownership_pct null

mandates
  id, property_id, owner_client_id, exclusive bool, commission_pct, commission_terms text,
  signed_at, expires_at, file_url, status (vigente | vencido | terminado)

deals
  id, tenant_id, property_id, operation (venta | arriendo), price, currency,
  stage, lost_reason null, reserved_at, closed_at, created_at

deal_parties
  id, deal_id, client_id, role (vendedor | comprador | arrendador | arrendatario)

deal_brokers
  id, deal_id, user_id, share_pct

kyc_cases
  id, client_id, deal_id null, level (simple | reforzada), status (pendiente | en_revision | aprobado | rechazado),
  provider, provider_ref, risk_score, pep bool, list_hits jsonb, funds_origin text null,
  biometric_consent_at null, reviewed_by null, reviewed_at null, retain_until date, created_at

kyc_documents                     -- almacenamiento privado aparte
  id, kyc_case_id, kind (carnet_frente | carnet_reverso | selfie | escritura | vigencia | otro),
  storage_key, sha256, created_at

kyc_access_log
  id, kyc_case_id, user_id, action (ver | descargar | aprobar | rechazar), created_at

compliance_alerts
  id, deal_id, kind, details jsonb, status (abierta | descartada | escalada), handled_by null, created_at

invoices
  id, tenant_id, deal_id null, client_id, dte_type, folio null, net, vat, total, currency,
  status (borrador | emitida | enviada | pagada | vencida | anulada), provider_ref, pdf_url,
  issued_at null, due_at null, paid_at null, approved_by null

payments
  id, invoice_id, amount, method, paid_at, reference

broker_payouts
  id, user_id, period, amount, details jsonb, status (calculada | aprobada | pagada)

pipeline_tasks
  id, entity (lead | deal), entity_id, user_id, title, due_at, done_at

web_events
  id, session_id, lead_id null, event, property_id null, utm jsonb, gclid null, fbclid null, created_at

ad_metrics_daily
  id, tenant_id, platform (meta | google), campaign_id, ad_id null, date,
  spend_clp, impressions, clicks, conversions, raw jsonb

offline_conversions
  id, platform, lead_id, event (visita_realizada | reserva | cierre), value_clp null,
  sent_at null, status (pendiente | enviada | error)
```

## 5. Estructura del repositorio (cambios)

```
apps/
  web/            Next.js, web pública
  backoffice/     Next.js, reemplaza a apps/panel
  api/  worker/  voice/
packages/
  agent/ whatsapp/ calendar/ properties/ intake/ content/ social/ db/
  crm/            pipeline, operaciones, tareas
  kyc/            portal de verificación, adaptador del proveedor, listas, riesgo
  billing/        adaptador del proveedor de facturación electrónica, cobros, liquidaciones
  analytics/      GA4, Meta Insights, Google Ads, conversiones offline
```

## 6. Paso a paso completo

Este orden integra los pasos de `docs/sistema-ia.md` (marcados "IA n") con los módulos nuevos. Estimaciones para una persona con Claude Code.

| # | Paso | Semanas | Depende de |
|---|---|---|---|
| 1 | Núcleo del back office: auth, roles, auditoría y propiedades con planillas y fotos (IA 1) | 1,5 | — |
| 2 | Web pública con medición, privacidad y cookies | 2,5 | 1 |
| 3 | Asistente del corredor: ficha y textos por voz (IA 2) | 1,5 | 1 |
| 4 | Agente de WhatsApp (IA 3) | 3,5 | 1 |
| 5 | Pipeline y operaciones | 2 | 4 |
| 6 | Estudio de contenido y agente de redes con Meta Ads (IA 4 y 5) | 4 | 3 |
| 7 | Google Ads y control de gestión | 2 | 2, 5, 6 |
| 8 | KYC | 2,5 | 5 |
| 8 bis | Contratos y documentos legales de la propiedad (`docs/contratos.md`) | 2 | 8 |
| 9 | Facturación | 2 | 5, 8 |
| 10 | Agente de voz (IA 6) | 3 | 4 |
| 11 | Métricas y mejora continua (IA 7) | permanente | 7 |

Total: unas 26 semanas con una persona. Con dos personas en paralelo (una en web, contenido y gestión; otra en agentes, KYC, contratos y facturación), unas 15.

Recomendación de prioridad para Bull Haus: los pasos 1, 2 y 4 primero, porque dan web propia y atención 24/7, que es lo que más se nota en ventas. El KYC (8) conviene adelantarlo si Bull Haus hoy no tiene un proceso de debida diligencia, porque es una obligación legal vigente y una fiscalización puede llegar antes que el resto.

Órdenes para Claude Code de los pasos nuevos:

> Paso 1. Lee docs/propuesta.md, docs/sistema-ia.md y docs/plataforma.md. Crea apps/backoffice en Next.js con auth de Supabase y los roles de la sección 3.1, audit_log en cada acción y la gestión de propiedades del paso 1 de sistema-ia.md, más mandatos con aviso de vencimiento. Tests de permisos por rol.

> Paso 2. Crea apps/web según la sección 2 de docs/plataforma.md: inicio, listado con filtros, ficha con datos estructurados de schema.org y botón de WhatsApp con el código de la propiedad, página de captación de propietarios con formulario, páginas por comuna, blog, privacidad y banner de cookies que bloquea las etiquetas hasta el consentimiento. GA4, Google Ads y píxel de Meta con eventos de la sección 2, más API de conversiones de Meta desde el servidor. Solo muestra propiedades disponibles y marcadas para la web.

> Paso 5. Implementa packages/crm y su interfaz en apps/backoffice según la sección 3.4: dos tableros kanban, tareas, movimiento automático por los agentes hasta visita o tasación agendada, creación de deal al llegar a Reserva con partes, corredores y reparto de comisión. Embudo con tasas de paso.

> Paso 7. Implementa packages/analytics según la sección 3.7: lectura diaria de GA4, Meta Insights y Google Ads a ad_metrics_daily, atribución por ad_id, gclid y UTM, envío de conversiones offline a Meta y Google al avanzar el pipeline, y tablero de embudo con costos por etapa y alertas. Campañas de búsqueda de Google creadas desde el back office solo tras aprobación del presupuesto.

> Paso 8. Implementa packages/kyc según la sección 3.5: portal de verificación con enlace seguro, adaptador intercambiable del proveedor de identidad, declaraciones PEP y de origen de fondos, beneficiarios finales para personas jurídicas, revisión de listas, puntaje de riesgo, aprobación por el rol de cumplimiento, bloqueo de etapas sin KYC aprobado, almacenamiento privado separado, kyc_access_log y retención de 5 años. Ningún documento pasa por Claude ni por logs. Tests de permisos y de bloqueo de etapas.

> Paso 9. Implementa packages/billing según la sección 3.6: adaptador intercambiable del proveedor de facturación electrónica, borrador automático al cerrar una operación, emisión solo tras aprobación del rol de finanzas, notas de crédito, estados de cobro con recordatorios, liquidación mensual de comisiones por corredor y exportación contable. Tests con el ambiente de certificación del proveedor.

## 7. Pendientes con Bull Haus

- [PENDIENTE: dominio para la web]
- [PENDIENTE: razón social, RUT, giro y régimen tributario; sistema de facturación y contabilidad que usan hoy; contador de contacto]
- [PENDIENTE: si están inscritos en la UAF, quién es su oficial de cumplimiento y si tienen manual de prevención de lavado de activos]
- [PENDIENTE: cómo hacen hoy la debida diligencia y la evaluación de arrendatarios]
- [PENDIENTE: modelo de mandato y comisiones habituales]
- [PENDIENTE: si administran arriendos]
- [PENDIENTE: accesos a su cuenta publicitaria de Meta y a Google Ads (o crearla)]
- [PENDIENTE: reparto de comisiones entre corredores]
- [PENDIENTE: validación legal de KYC y biometría con un abogado chileno y con la DPO]
