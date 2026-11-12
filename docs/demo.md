# Demostración y paso a producción

Versión 1.0, 12/11/2026. Cómo está separada la demostración del sistema productivo y qué falta para que cada módulo funcione con datos reales.

## 1. La regla

- **Todo dato de demostración lleva `isDemo = true`**: leads, campañas, clientes, mandatos, datos legales y certificados, contratos y plantillas de demo, operaciones, KYC, facturas, conversaciones, base de conocimiento de ejemplo, cuentas y publicaciones de redes, métricas de anuncios y de la web, y los dos usuarios de demo (Cumplimiento y Finanzas).
- **Un registro de demostración solo usa integraciones simuladas, y un registro real solo usa integraciones conectadas** (`apps/backoffice/src/lib/providers.ts`). Si una integración real no está conectada, la acción sobre un registro real se bloquea con un mensaje; nunca se inventa un resultado para una persona real.
- Las plantillas de contratos de demo (`isDemo`) solo generan contratos de demo, con marca de agua "Demostración · sin validez". Un contrato real exige una plantilla sin `isDemo` aprobada por el abogado.
- Las propiedades y los usuarios reales no se modifican. Si una propiedad ya tiene un mandato real, la demo no le crea otro.
- El back office muestra una franja violeta "Modo demostración" mientras haya datos de demo, y cada módulo avisa qué integración está simulada.

## 2. Dónde está cada cosa

| Qué | Archivo |
|---|---|
| Carga y borrado de la demo | `apps/backoffice/src/lib/demo/index.ts` (un archivo por módulo en la misma carpeta) |
| Proveedores reales vs. simulados | `apps/backoffice/src/lib/providers.ts` |
| Catálogo de integraciones y qué necesita cada una | `packages/core/src/integrations.ts`, pantalla **Integraciones** |
| Reglas de operaciones, KYC y facturación | `packages/core/src/operations.ts` |
| Motor de plantillas y contratos | `packages/core/src/contract-template.ts`, `apps/backoffice/src/lib/contracts.ts` |
| Plantillas (copiadas de `docs/contratos`) | `packages/core/src/contract-templates.generated.ts` (`node scripts/gen-plantillas.mjs`) |

Se carga en **Carga de datos → Datos de demostración** y se borra con el botón de al lado.

## 3. Qué muestra la demo

| Módulo | Qué se ve | Real o simulado |
|---|---|---|
| Propiedades | La cartera importada de bullhaus.cl, con su sección "Legal y contratos" | Fichas reales; datos legales simulados |
| Leads y pipeline | 168 leads de 90 días por fuente, ficha de cada contacto y compromisos de contacto (vencidos, de hoy y próximos) con mensajes prearmados por WhatsApp o email | Simulado; los envíos a contactos demo se muestran como simulación |
| Brochures | Brochure de captación y de venta o arriendo por propiedad, con aprobación, envíos por WhatsApp, email, Instagram, Facebook, LinkedIn y enlace, aperturas por envío y leads que dejan sus datos en el brochure | Contenido desde las fichas reales; envíos y aperturas simulados |
| Operaciones | Cierres de los últimos 12 meses (propiedades vendidas y arrendadas) y operaciones en curso; bloqueo por KYC | Simulado |
| KYC | Casos en todos los estados, riesgo, PEP, registro de accesos y el portal `/verificacion/[token]` | Simulado, sin documentos |
| Contratos | Una orden de corretaje por propiedad, cartas oferta, minutas de promesa y contratos de arriendo | Plantillas reales de `docs/contratos`, datos simulados |
| Facturación | Facturas de comisión, nota de crédito, aprobación de Finanzas, cobranza, liquidación por corredor y exportación CSV | Simulado, sin SII |
| Agentes IA | Resumen, bandeja con tomar/devolver, ajustes por canal y base de conocimiento | Conversaciones simuladas; ajustes y base reales |
| Redes sociales | @bullhaus_propiedades y BullHauspropiedades con 120 días de seguidores, alcance y publicaciones | Simulado; textos desde las fichas |
| LinkedIn "Bull Haus te asesora" | Página de empresa con 90 días de seguidores, consejos publicados cada martes y calendario editorial (borrador, revisión, aprobado, publicado) | Simulado; textos de la biblioteca `packages/core/src/linkedin-tips.ts`, aprobados por una persona |
| Agente de redes sociales (`/agentes/redes`) | Agente encendido, publicaciones de Instagram y Facebook preparadas por él a partir de las fichas, cuatro propiedades esperando aprobación y bitácora de 60 días con comentarios y mensajes respondidos, derivaciones e informes semanales | Simulado; los textos salen de las fichas y nada se publica sin aprobación |
| Días en vender y arrendar (inicio y Control de gestión) | Promedio y mediana de días desde la salida al mercado hasta la reserva, de la reserva al cierre y tendencia por trimestre | Fechas de las operaciones de demostración; en la web pública solo se muestran cifras de operaciones reales (mínimo 5 en 12 meses) |
| Campañas | Campañas de captación y venta con gasto diario | Simulado |
| Control de gestión | Embudo, costo por etapa, retorno, fuentes, GA4 y alertas | Simulado |

Usuarios de demo: `cumplimiento.demo@bullhaus.local` (Cumplimiento) y `finanzas.demo@bullhaus.local` (Finanzas). Se crean sin contraseña utilizable; para mostrar la aprobación de un KYC o la emisión de una factura, un administrador les restablece la contraseña en **Usuarios** y se entra con ese usuario. Así se ve la separación de funciones: el administrador no aprueba KYC ni emite facturas.

## 4. Paso a producción, módulo por módulo

Antes de todo: plan **Pro** de Vercel (el plan Hobby no permite uso comercial) y borrar la demo.

1. **Agentes IA**: número de WhatsApp Business dedicado, Meta Business verificado, plantillas aprobadas, cuenta de Anthropic, calendarios de los corredores, la base de conocimiento real y los evals en verde. Construir `apps/worker` y el adaptador de WhatsApp.
2. **KYC**: elegir proveedor (Truora, MetaMap o Sumsub), inscripción en la UAF y oficial de cumplimiento, validación legal de la biometría. Implementar el adaptador real en `verifyIdentity`.
3. **Contratos**: plantillas revisadas y aprobadas por el abogado (cargarlas sin `isDemo` y con `approvedByLawyer`), datos reales de la empresa (razón social, RUT, representante) en lugar de `DEMO_COMPANY`, carga de certificados reales con extracción y confirmación campo a campo, y proveedor de firma electrónica.
4. **Facturación**: razón social, giro y régimen tributario, proveedor de facturación electrónica con certificado digital, reparto real de comisiones entre corredores. Implementar el adaptador real en `emitTaxDocument`.
5. **Redes y control de gestión**: app de Meta aprobada (Instagram, páginas y anuncios), cuenta de Google Ads con token de desarrollador y propiedad de GA4 del sitio nuevo. Implementar la lectura diaria a `AdMetricDaily`, `SocialDaily`, `SocialPost` y `WebMetricDaily` en el worker.
6. **Brochures y compromisos**: definir `BROCHURE_BASE_URL` (idealmente un dominio de Bull Haus) y revisar con Bull Haus los textos de los mensajes prearmados (`packages/core/src/outreach.ts`). Con contactos reales, los botones abren el WhatsApp o el correo del corredor con el texto listo (`wa.me` y `mailto`); no necesitan integración, y el sistema nunca escribe solo. Los recordatorios hoy se ven en el inicio y en el pipeline; para avisos por email o WhatsApp al corredor hace falta un proveedor de correo o plantillas aprobadas de WhatsApp.
7. **LinkedIn**: página de empresa de Bull Haus con un administrador, app de LinkedIn con Community Management API aprobada y el calendario editorial aprobado. Implementar el adaptador real en `publishSocialPost` y la lectura de estadísticas de la página. La biblioteca de consejos la revisa Bull Haus; un consejo nunca incluye cifras, asesoría de crédito ni asesoría legal.
8. **Agente de redes e indicador de días en el mercado**: el agente usa la misma conexión de Meta que las campañas (`publishSocialPost`) y las respuestas a comentarios pasan por el asistente virtual con sus reglas y evals. El indicador se llena solo: cada propiedad guarda `listedAt` la primera vez que queda disponible y el indicador la toma cuando la operación se reserva. Las propiedades importadas antes de este cambio no tienen fecha; conviene cargarla a mano en las que se vendan o arrienden pronto.

Cada integración se marca como conectada en **Integraciones** cuando sus variables de entorno están configuradas en Vercel.
