# Ficha del cliente: Bull Haus Propiedades

Etapa 1 de la skill `nuevo-proyecto`, 13/11/2026. Actualizada el 13/11/2026 con las respuestas del usuario. Hecha con lo que ya está en `docs/propuesta.md` (datos tomados de www.bullhaus.cl el 11/11/2026), `docs/plataforma.md` y `docs/sistema-ia.md`. Fuente de cada dato entre paréntesis.

## Quién es

| Campo | Valor |
|---|---|
| Nombre | Bull Haus Propiedades, "Intermediación y Gestión Inmobiliaria" (web) |
| Tipo | Cliente directo (respuesta del usuario, 13/11/2026). No pasa por Grupo MOK |
| Quién aprueba fichas, publicaciones, campañas y presupuestos | Un responsable de Bull Haus. [FALTA: nombre y correo, para darle el rol de aprobación en el back office] |
| Razón social, RUT, giro y régimen tributario | [FALTA] (`plataforma.md` 3.6). Se usan para: emitir las facturas de comisión por el proveedor de facturación electrónica, los datos de la corredora en promesas y contratos, la verificación del negocio en Meta (exigida para WhatsApp Cloud API y anuncios) y el contrato de encargo de datos con cada proveedor |
| Contacto | contacto@bullhaus.cl, +56 9 9200 0211 (web) |
| Oficina | San Sebastián 2957, Las Condes (web) |
| Equipo | Cinco corredores, dos de ellos socios, uno a cargo de la V Región Costa; todos con el mismo número (web) |

## Jurisdicción

| Campo | Valor |
|---|---|
| País o mercado | Chile |
| Dónde están sus usuarios | Chile (Región Metropolitana y V Región) |
| Jurisdicción del proyecto | `cl` (ya en código: `PROJECT_JURISDICTION`) |
| Ley que aplica | Ley 19.628 reformada por la Ley 21.719 (en vigor desde el 01/12/2026); además Ley 19.496 (consumidor) y Ley 20.609 (no discriminación) |
| ¿Exige el cliente que los datos queden en una región? | Respuesta del usuario: "los datos son en Chile". Hoy están en París (`docs/residencia-datos.md`). [FALTA: aclarar si exige alojamiento físico en Chile o si basta con aplicar la ley chilena] |

## Negocio

| Campo | Valor |
|---|---|
| Rubro | Corretaje de propiedades |
| Servicios | Compra, venta y arriendo; gestión inmobiliaria de proyectos; asesoría y valorizaciones con tasación en terreno (web) |
| Administración de arriendos | No la ofrecen (respuesta del usuario) |
| Zonas | Las que muestra el filtro de www.bullhaus.cl (respuesta del usuario): Aventura, Colina, La Reina, Las Condes, Lo Barnechea, Macul, Ñuñoa, Providencia, Puchuncaví, Santiago, Valparaíso y Vitacura, más la línea "V Región Costa". La web nueva crea una página por cada comuna que tenga propiedades disponibles |
| Cartera visible | Departamentos desde UF 4.150 hasta casas de UF 34.000, con código numérico (web) |
| Ingreso por venta | Comisión de corretaje a cada parte según el mandato, con IVA (`plataforma.md`). Cobran comisión en venta y en arriendo (respuesta del usuario). [FALTA: el porcentaje de cada una; sin eso no hay ROI] |
| Contactos más valiosos | Propietarios, porque traen cartera nueva (`propuesta.md`) |
| Objetivo medible | Visitas, tasaciones y llamadas agendadas con hueco real y confirmación del contacto (`propuesta.md`). Bull Haus planifica las metas y las asigna a cada corredor (respuesta del usuario): el back office debe permitir cargar la meta mensual por corredor |
| Plazo para medirlo | Piloto de 2 semanas con 3 o 4 propiedades (`propuesta.md`). [FALTA: meta a 3 y 12 meses] |

## Situación actual

| Campo | Valor |
|---|---|
| Web | www.bullhaus.cl sobre Convecta, con buscador, ficha por código y botón de WhatsApp. Ya existe una web nueva propia en este repo (`apps/web`). Decisión: convivir con Convecta hasta que la plataforma propia cubra el 100% (respuesta del usuario) |
| Redes | Instagram @bullhaus_propiedades y Facebook BullHauspropiedades. Seguidores e interacción: se miden en la etapa 2 |
| LinkedIn | Página de empresa planificada ("Bull Haus te asesora"), hoy en modo demo |
| Publicidad activa | [FALTA: ¿hacen Meta Ads o Google Ads hoy? ¿Con qué presupuesto mensual?] |
| Portales | Quieren publicar en los principales portales, empezando por Portal Inmobiliario (respuesta del usuario). Tarea de la etapa 3: revisar la API pública de cada portal y qué hace hoy Convecta |
| CRM | El de Convecta (respuesta del usuario). Mientras convivan, hay que definir cómo pasan los leads entre Convecta y el back office |
| Leads al mes | Los mide Bull Haus (respuesta del usuario). [FALTA: el número, para la calculadora de ROI] |
| Conversión | La mide Bull Haus. [FALTA: de cada 10 contactos, cuántos visitan y cuántos cierran] |
| Quién atiende hoy los mensajes | Los corredores, en un número compartido. [FALTA: horario de atención] |

## Competencia

[FALTA: dos o tres corredoras que Bull Haus considere su competencia directa en Las Condes y Lo Barnechea. Si no tienen nombres, en la etapa 2 propongo candidatas a partir de los anuncios activos en Meta y de los portales.]

| Nombre | Web o cuenta | Qué hace mejor |
|---|---|---|
| | | |

## Lo que ya está hecho y no hay que repetir

- Back office con propiedades, pipeline, KYC, contratos, facturación, campañas y control de gestión (en modo demo donde faltan integraciones).
- Embudo de atribución diseñado hasta la comisión facturada: impresiones → clics → contactos → visitas → ofertas → cierres → comisión, por fuente, campaña, propiedad, comuna y corredor (`plataforma.md` sección 4).
- Prompt del agente de WhatsApp v2.1 en cinco piezas (`docs/prompt-agente-whatsapp.md`).
- Jurisdicción, capa de modelo y lista de proveedores en código.

## Pendientes de la etapa 1

Respondido el 13/11/2026: cliente directo, no administran arriendos, comunas de la web, metas por corredor que fija Bull Haus, CRM de Convecta, convivir con Convecta y publicar en portales.

Para Bull Haus:

1. Razón social, RUT, giro y régimen tributario (para facturas, contratos y la verificación de Meta).
2. Nombre y correo del responsable que aprueba fichas, publicaciones y campañas.
3. Porcentaje de comisión en venta y en arriendo.
4. Leads al mes y conversión (cuántos visitan y cuántos cierran).
5. Presupuesto actual de publicidad, si pautan.
6. Horario de atención.
7. Competencia directa (hay tres candidatas en `docs/diagnostico.md`).
8. Acceso o exportación del CRM de Convecta, para no perder el historial de leads.

Para ti:

9. "Los datos son en Chile": ¿Bull Haus exige que los servidores estén físicamente en Chile, o basta con cumplir la ley chilena con los datos donde están hoy (París)?
