# Protección de datos y residencia

Bull Haus atiende a clientes en Chile, así que se rige por la **Ley 19.628 reformada por la Ley 21.719** (en vigor desde el 01/12/2026), no por el RGPD. Esa ley permite transferir datos al extranjero, también a EE. UU., si hay garantías: contrato de encargo con Bull Haus, DPA con cada proveedor y la transferencia informada en la política de privacidad.

La jurisdicción está en código: `PROJECT_JURISDICTION = "cl"` en `packages/core/src/data-residency.ts`. Si el motor se vende a una inmobiliaria de la UE, ese proyecto usa `"eu"` y las comprobaciones de abajo se vuelven obligatorias.

## 1. Infraestructura

| Pieza | Dónde | Dónde se fija |
|---|---|---|
| Back office (Vercel) | `cdg1`, París | `apps/backoffice/vercel.json` |
| Web pública (Vercel) | `cdg1`, París | `apps/web/vercel.json` |
| Base de datos y archivos | Supabase `eu-west-3`, París | proyecto de Supabase |

**Decisión del 13/11/2026:** todo sigue en la UE (París) mientras se construye la plataforma. Cuando opere de verdad en Chile, se revisan las alternativas y costos de alojar allá; el punto de partida está en `docs/plataforma-saas.md`, sección 1.

Se quedó en París porque ya estaba ahí y el resto de Grupo MOK está en la UE; para Chile no es obligatorio. Si la latencia desde Santiago molesta, la opción es São Paulo (Vercel `gru1` y Supabase `sa-east-1`), moviendo las dos piezas juntas. Un test comprueba que cada `vercel.json` declare `HOSTING_REGIONS`: sin el campo `regions`, Vercel usa `iad1` (Washington).

## 2. Modelo de IA

El agente no llama a ningún SDK: usa `LlmClient.generate()` de `packages/llm`, y `createLlm()` elige el proveedor con variables de entorno.

```
LLM_PROVIDER=anthropic        # anthropic | openai | vertex | bedrock
LLM_MODEL_CHAT=               # anthropic: claude-sonnet-5-5 por defecto; openai: obligatorio
LLM_MODEL_FAST=               # anthropic: claude-haiku-5-5 por defecto
LLM_REGION=                   # solo vertex o bedrock
ANTHROPIC_API_KEY=            # o OPENAI_API_KEY
```

| Proveedor | Dónde procesa | Chile (`cl`) | UE (`eu`) |
|---|---|---|---|
| `anthropic` (API directa) | EE. UU. o global | Permitido | Rechazado en producción y en vistas previas |
| `openai` (API directa) | EE. UU. | Permitido | Rechazado (la residencia en Europa de OpenAI exige un proyecto aprobado) |
| `vertex` con `europe-*` o `eu` | UE | Permitido | Permitido |
| `bedrock` con `eu-*` | UE | Permitido | Permitido |

`resolveModelRoute()` hace la comprobación y `createLlm()` la llama siempre. Los adaptadores de Vertex y Bedrock no están instalados porque Bull Haus no los necesita; si un proyecto UE los pide, se instala `@anthropic-ai/vertex-sdk` o `@anthropic-ai/bedrock-sdk` y su cliente se pasa a `anthropicAdapter`.

Desarrollar con Claude Code no es una transferencia de datos de clientes mientras no se peguen datos reales. Para probar se usan los datos de demostración (`isDemo`).

## 3. Subencargados

La lista viva está en `SUBPROCESSORS` (`packages/core/src/data-residency.ts`) y se resume en `/privacidad`.

| Proveedor | Datos | Dónde | Garantía |
|---|---|---|---|
| Supabase | Todo | UE (París) | DPA por firmar |
| Vercel | Peticiones, registros de plataforma | UE (`cdg1`) + CDN global | DPA por aceptar |
| Anthropic o OpenAI | Mensajes y fichas | EE. UU. | DPA del proveedor; no entrenan con datos de la API |
| Meta (WhatsApp, Instagram, Facebook) | Mensajes | EE. UU. y otros | Condiciones de Meta Business; inevitable para usar el canal |
| Google (Calendar, GA4, Ads) | Agenda; medición con consentimiento | EE. UU. y otros | GA4 y Ads solo tras aceptar cookies (ya está así) |
| LinkedIn | Publicaciones de empresa | EE. UU. y otros | Sin datos de contactos |
| Voz, KYC, firma electrónica | Audio, documentos, contratos | Por definir | Pedir DPA al elegirlos; KYC es la pieza más sensible |
| Facturación electrónica | Datos tributarios | Chile | Sin transferencia |

## 4. Piezas pequeñas donde se cuelan datos

- **Monitoreo de errores (Sentry):** `sendDefaultPii: false` y quitar cuerpos de mensaje en `beforeSend`.
- **Cola (Upstash Redis):** los trabajos guardan IDs, no el texto de los mensajes.
- **Logs:** no registrar el cuerpo de los mensajes en producción (regla de `CLAUDE.md`).
- **Analítica:** GA4 solo con consentimiento; nada de analítica de terceros en el back office.

## 5. Lo que no se resuelve en código

- Contrato de encargo con Bull Haus que autorice a estos subencargados.
- DPA aceptado con cada proveedor de la tabla.
- Texto de `/privacidad` revisado por la DPO antes de publicar el sitio. [PENDIENTE: validar con la DPO]
