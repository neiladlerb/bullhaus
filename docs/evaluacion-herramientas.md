# Evaluación de herramientas: Claude, Antigravity, n8n y GoHighLevel

Fecha: 13/11/2026. Objetivo: armar agentes y servicios gastando poco mientras se aprende. Los precios salen de guías de terceros, que no coinciden entre sí: hay que confirmarlos en la página oficial antes de pagar (fuentes al final).

## Respuesta corta

| Herramienta | Qué es de verdad | Para qué usarla | Costo para empezar |
|---|---|---|---|
| **Claude (API)** | El modelo que piensa y responde en producción | El "cerebro" del agente, llamado desde tu código por `packages/llm` | Pago por uso; centavos por conversación (cálculo abajo) |
| **Claude Code** | Herramienta para programar con IA | Construir y mantener los proyectos (lo que usas ahora) | Tu plan actual |
| **Google Antigravity** | Entorno de desarrollo con agentes (editor, CLI, SDK), competencia de Claude Code | Opcional, para probar Gemini programando. **No es el cerebro del agente en producción** | Nivel gratis; pago desde el plan Pro de Google AI |
| **n8n** | Orquestador de automatizaciones con nodos visuales | Conectar sistemas: avisos, sincronizaciones, reportes, tareas programadas | Gratis autoalojado (más un servidor de ~US$ 5-10); en la nube desde ~€24/mes |
| **GoHighLevel** | CRM todo en uno para agencias (contactos, pipeline, calendarios, embudos, mensajería) | CRM listo para clientes nuevos o para revender como agencia | US$ 97/mes Starter; US$ 297/mes Unlimited (trae la API) |

## Corrección importante: Antigravity no es un "cerebro"

Antigravity es un lugar donde **programas**, como Claude Code o Cursor: te ayuda a escribir el agente, pero no queda corriendo para atender a los clientes. El cerebro en producción siempre es un **modelo por API** (Claude, Gemini u OpenAI), llamado desde tu código o desde n8n.

Tener dos herramientas de programación duplica costos y te obliga a aprender dos cosas a la vez. Como ya trabajas con Claude Code, la recomendación es seguir con él. Si quieres comparar con Gemini como modelo del agente, lo correcto es agregar un adaptador de Gemini en `packages/llm` y medir con los evals, no cambiar de editor.

## Cómo encajan las piezas

```
Contacto (WhatsApp, web, Instagram)
        │
        ▼
Agente propio (código, con tests y evals)        ← lo que construimos
  - prompt de 5 piezas, herramientas, reglas
  - packages/llm → Claude (u OpenAI / Gemini)
        │ eventos: lead nuevo, visita agendada, baja
        ▼
n8n (orquestador)                                 ← lo que configuramos
  - avisar al corredor, sincronizar CRM, reportes, recordatorios
        │
        ▼
CRM: back office propio (Bull Haus) o GoHighLevel (otros proyectos)
```

**Regla de reparto:** lo que tiene reglas que no se pueden romper (confirmar antes de agendar, máximo de rechazos, palabras de baja, KYC, contratos) va en **código con tests**. Lo que es mover datos entre sistemas va en **n8n**. Un agente armado solo con nodos de n8n es rápido de prototipar, pero difícil de probar y versionar, y ahí es donde se cuelan errores con clientes reales.

## Qué construir y qué comprar

| Pieza | Decisión | Por qué |
|---|---|---|
| Agente (prompt, herramientas, reglas, evals) | **Construir** | Es lo que diferencia tu servicio y lo que tiene que cumplir reglas exactas |
| Capa de modelo (`packages/llm`) | **Construir** (ya está) | Te deja cambiar de Claude a OpenAI o Gemini sin reescribir |
| Back office de un vertical con procesos propios (Bull Haus: fichas, KYC, contratos, facturación) | **Construir** (ya está) | GoHighLevel no hace KYC, contratos ni fichas de propiedades |
| CRM genérico para clientes nuevos | **Comprar** (GoHighLevel) | Pipeline, calendarios, formularios y mensajería listos en días |
| Integraciones y avisos | **Configurar** (n8n) | Cientos de conectores; no vale la pena programarlos |
| Canal WhatsApp | **Comprar** (Meta Cloud API, o el de GoHighLevel si ya lo pagas) | No se construye |

### Bull Haus en particular

Bull Haus ya tiene su propio CRM (leads, pipeline, operaciones, agenda). Si le agregas GoHighLevel, quedan **dos fuentes de verdad**: cada lead habría que sincronizarlo en las dos direcciones y pagarías US$ 97-297 al mes por algo que ya existe. Recomendación: Bull Haus sigue con su back office, y GoHighLevel se usa en los proyectos nuevos donde todavía no hay nada construido.

## Cálculo de costo del modelo (estimación)

Una conversación de WhatsApp de unos 10 turnos, con un prompt de ~4.000 tokens más la ficha y el historial, suma del orden de 60.000 tokens de entrada y 2.000 de salida.

| Modelo | Entrada / salida por millón de tokens | Costo aprox. por conversación |
|---|---|---|
| Claude Sonnet 5.5 | US$ 2 / US$ 10 | ~US$ 0,14 sin caché; bastante menos con caché de prompt |
| Claude Haiku 5.5 | US$ 0,10 / US$ 0,50 | ~US$ 0,01 |

Con 1.000 conversaciones al mes: unos US$ 140 con Sonnet o US$ 10 con Haiku. Por eso la capa de modelo tiene dos niveles (`chat` y `fast`): Haiku para clasificar y resumir, y Sonnet solo donde la calidad lo exige. Los evals dicen dónde alcanza Haiku.

## Configuración recomendada para empezar

| Pieza | Elección | Costo mensual aprox. |
|---|---|---|
| Programar | Claude Code (ya lo usas) | Plan actual |
| Modelo del agente | Claude por API, Haiku donde los evals lo permitan | Por uso (US$ 10-150 según volumen) |
| Orquestador | n8n autoalojado (Community) en un servidor chico; pasar a la nube si mantener el servidor te quita tiempo | US$ 5-10 (o ~€24 en la nube) |
| CRM | Back office propio en Bull Haus; GoHighLevel Starter solo cuando llegue un proyecto sin CRM | US$ 0 hoy; US$ 97 por proyecto nuevo |
| Antigravity | No por ahora | US$ 0 |

Puntos a revisar antes de comprometerse:

- **GoHighLevel:** la API (necesaria para conectar tu agente) aparece en el plan Unlimited según las guías. Confirmarlo, junto con los cobros por uso de teléfono y SMS, antes de elegir Starter.
- **n8n:** la licencia de la edición Community permite uso interno. Si piensas revender n8n como servicio a tus clientes, revisa la licencia.
- **Protección de datos:** GoHighLevel y n8n en la nube son subencargados nuevos: van a `SUBPROCESSORS` y a la política de privacidad del proyecto que los use.

## Fuentes

- Antigravity: [blog de Google, cambios de planes](https://www.antigravity.google/blog/changes-to-antigravity-plans), [The Register](https://www.theregister.com/2026/03/12/users_protest_as_google_antigravity/), [CloudZero](https://www.cloudzero.com/blog/google-antigravity-pricing/)
- n8n: [Sliplane](https://sliplane.io/blog/n8n-pricing), [CloudZero](https://www.cloudzero.com/blog/n8n-pricing/), [Jetadmin](https://www.jetadmin.io/blog/n8n-pricing/)
- GoHighLevel: [RSLA](https://rsla.io/blog/go-high-level-pricing), [DEV Community](https://dev.to/robert_denim/gohighlevel-pricing-2026-complete-cost-breakdown-hidden-fees-4cdm), [Ciela](https://ciela.ai/blogs/gohighlevel-pricing-ai-automation-agencies)
- Claude: precios de la API de Anthropic al 03/11/2026.
