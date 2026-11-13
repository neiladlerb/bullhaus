# Ficha del cliente: Bull Haus Propiedades

Etapa 1 de la skill `nuevo-proyecto`, 13/11/2026. Hecha con lo que ya está en `docs/propuesta.md` (datos tomados de www.bullhaus.cl el 11/11/2026), `docs/plataforma.md` y `docs/sistema-ia.md`. Fuente de cada dato entre paréntesis.

## Quién es

| Campo | Valor |
|---|---|
| Nombre | Bull Haus Propiedades, "Intermediación y Gestión Inmobiliaria" (web) |
| Tipo | [FALTA: ¿cliente directo tuyo o cliente de Grupo MOK como agencia? La propuesta habla de "nosotros, encargados" y menciona los servicios de Grupo MOK] |
| Quién aprueba fichas, publicaciones, campañas y presupuestos | [FALTA: nombre y rol en Bull Haus; el sistema ya exige aprobación de una persona de Bull Haus] |
| Razón social, RUT, giro y régimen tributario | [FALTA] (`plataforma.md` 3.6) |
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
| ¿Exige el cliente que los datos queden en una región? | No consta. Los datos están en París por decisión propia (`docs/residencia-datos.md`). [FALTA: confirmar con Bull Haus y la DPO] |

## Negocio

| Campo | Valor |
|---|---|
| Rubro | Corretaje de propiedades |
| Servicios | Compra, venta y arriendo; gestión inmobiliaria de proyectos; asesoría y valorizaciones con tasación en terreno (web) |
| Administración de arriendos | [FALTA: ¿la ofrecen?] |
| Zonas | Las Condes, Lo Barnechea, Providencia y Macul, más una línea "V Región Costa" (web). [FALTA: lista completa de comunas] |
| Cartera visible | Departamentos desde UF 4.150 hasta casas de UF 34.000, con código numérico (web) |
| Ingreso por venta | Comisión de corretaje a cada parte según el mandato, con IVA (`plataforma.md`). [FALTA: % de comisión estándar en venta y en arriendo; sin esto no hay ROI] |
| Contactos más valiosos | Propietarios, porque traen cartera nueva (`propuesta.md`) |
| Objetivo medible | Visitas, tasaciones y llamadas agendadas con hueco real y confirmación del contacto (`propuesta.md`). [FALTA: número meta al mes, p. ej. "40 visitas y 8 tasaciones"] |
| Plazo para medirlo | Piloto de 2 semanas con 3 o 4 propiedades (`propuesta.md`). [FALTA: meta a 3 y 12 meses] |

## Situación actual

| Campo | Valor |
|---|---|
| Web | www.bullhaus.cl sobre Convecta, con buscador, ficha por código y botón de WhatsApp. Ya existe una web nueva propia en este repo (`apps/web`). [FALTA: decidir entre reemplazar Convecta o convivir, `plataforma.md` sección 2] |
| Redes | Instagram @bullhaus_propiedades y Facebook BullHauspropiedades. Seguidores e interacción: se miden en la etapa 2 |
| LinkedIn | Página de empresa planificada ("Bull Haus te asesora"), hoy en modo demo |
| Publicidad activa | [FALTA: ¿hacen Meta Ads o Google Ads hoy? ¿Con qué presupuesto mensual?] |
| Portales | [FALTA: ¿publican en Portal Inmobiliario, Toctoc o Yapo, y a través de Convecta?] |
| CRM | [FALTA: ¿usan alguno? Si no, el back office de este repo cumple ese rol] |
| Leads al mes | [FALTA: volumen mensual de mensajes y contactos] |
| Conversión | [FALTA: de cada 10 contactos, cuántos visitan y cuántos cierran] |
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

Para Bull Haus:

1. Razón social, RUT, giro y régimen tributario.
2. Quién aprueba fichas, publicaciones, campañas y presupuestos.
3. Comisión estándar en venta y en arriendo.
4. Si administran arriendos.
5. Lista completa de comunas.
6. Meta de visitas y tasaciones al mes, a 3 y a 12 meses.
7. Leads al mes hoy y cuántos visitan y cierran.
8. Publicidad actual (canal y presupuesto) y portales.
9. Si usan un CRM.
10. Horario de atención.
11. Competencia directa.
12. Convecta: reemplazar o convivir.

Para ti:

13. ¿Bull Haus es tu cliente directo o cliente de Grupo MOK como agencia?
14. ¿Bull Haus pidió que los datos queden en la UE, o fue decisión nuestra?
