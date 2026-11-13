# Capa de modelo intercambiable

Guía para este y cualquier otro proyecto con agentes de IA. La implementación de referencia está en `packages/llm`.

## La idea en una frase

El agente le habla a **tu** interfaz (`generate`), nunca al SDK de Claude ni al de OpenAI. Cada proveedor es un adaptador de unas 60 líneas que traduce entre tu interfaz y su API. Cambiar de proveedor es cambiar una variable de entorno.

```
agente (prompt, herramientas, reglas)
        │  generate({ system, messages, tools })
        ▼
   LlmClient  ◄── createLlm(env) elige uno según LLM_PROVIDER
   ├─ anthropicAdapter  → API de Anthropic (o Vertex/Bedrock en la UE, mismo adaptador)
   ├─ openaiAdapter     → API de OpenAI
   └─ scriptedLlm       → respuestas fijas para tests y evals
```

## Por qué

- **Iterar sin reescribir.** Pruebas Claude y OpenAI en el mismo agente y te quedas con el que gane en los evals, no con el que elegiste el primer día.
- **Costo.** Puedes usar un modelo caro para conversar y uno barato para clasificar (`tier: "chat"` o `"fast"`), o cambiar cualquiera de los dos sin tocar código.
- **Cumplimiento.** Si un proyecto termina en la UE, se agrega un adaptador con región UE y el agente no cambia.
- **Tests sin red.** `scriptedLlm` simula al modelo; los tests del agente no gastan dinero ni dependen de internet.

## Las cinco piezas

1. **Tipos neutrales** (`types.ts`): `LlmMessage` (user, assistant, tool), `ToolDef` (nombre, descripción, esquema JSON), `GenerateResult` (texto, `toolCalls`, `stop`). Aquí no aparece nada propio de un proveedor.
2. **Un adaptador por proveedor** (`anthropic.ts`, `openai.ts`): traduce mensajes y herramientas al formato del proveedor y la respuesta de vuelta. Usa el SDK oficial de cada uno.
3. **La fábrica** (`createLlm`): lee `LLM_PROVIDER`, valida la residencia según el país del proyecto y devuelve un `LlmClient`.
4. **El bucle de herramientas** (`runWithTools`): llama al modelo, ejecuta las herramientas que pide y repite. Es igual para todos los proveedores.
5. **El adaptador falso** (`scriptedLlm`): para tests y evals.

## Cómo se usa en el agente

```ts
import { createLlm, runWithTools } from "@bullhaus/llm";

const llm = createLlm(); // lee LLM_PROVIDER, LLM_MODEL_CHAT, la clave...

const { result } = await runWithTools(
  llm,
  { system: PROMPT, messages: historial, tools: [getProperty, bookAppointment] },
  {
    get_property: async (input) => JSON.stringify(await fichas.get(GetPropertyInput.parse(input))),
    book_appointment: async (input) => agendar(BookInput.parse(input)), // aquí van las reglas: nombre, confirmación...
  },
);
```

Las reglas de negocio (validar con Zod, exigir confirmación, máximo de rechazos, palabras de baja) van en los handlers y en el worker, **nunca** en el adaptador. Así se cumplen igual con cualquier modelo.

## Cómo comparar proveedores

1. Arma el set de evals una sola vez: conversaciones reales anonimizadas o ficticias, con lo que se espera en cada una (`evals/`).
2. Córrelo con `LLM_PROVIDER=anthropic` y después con `LLM_PROVIDER=openai LLM_MODEL_CHAT=<modelo>`.
3. Compara aciertos, costo por conversación completa (no por llamada) y latencia.
4. Cambia la variable en Vercel. No hay despliegue de código.

## Cómo agregar un proveedor

1. Crea `src/<proveedor>.ts` con una función que devuelva un `LlmClient`.
2. Copia los tests de `llm.test.ts` con un cliente simulado: tiene que devolver el mismo `GenerateResult` para la misma petición.
3. Agrégalo a `MODEL_PROVIDERS` (`packages/core/src/data-residency.ts`) y al `switch` de `createLlm`.
4. Agrégalo a `SUBPROCESSORS` y a la política de privacidad.

## Detalles que importan

- **Historial con razonamiento.** Claude devuelve bloques de razonamiento que hay que reenviar tal cual en el siguiente turno. El adaptador los guarda en `message.raw` y los reenvía solo si el proveedor es el mismo. Por eso el historial siempre se arma con `result.message`, nunca reconstruyéndolo a mano.
- **Resultados de herramientas juntos.** Todos los resultados de un turno van en un solo mensaje `tool`.
- **Argumentos inválidos.** OpenAI entrega los argumentos como texto JSON; si no se puede parsear, el handler lo rechaza al validar con Zod.
- **Rechazos.** `stop: "refused"` significa que el modelo se negó. En la API directa de Anthropic el adaptador activa el respaldo automático del servidor (`fallbacks: "default"`), que reintenta con otro modelo.
- **Funciones exclusivas.** Lo que solo tiene un proveedor (búsqueda web del servidor, caché de prompts, etc.) se agrega como opción del adaptador, no en la interfaz común. Si el agente depende de eso, el cambio de proveedor deja de ser gratis, y hay que decidirlo a conciencia.

## Checklist para un proyecto nuevo

1. ¿Para qué país es? Define `PROJECT_JURISDICTION` (`"cl"`, `"eu"`...). Eso decide qué proveedores y regiones se permiten.
2. Copia `packages/llm` y `data-residency.ts`.
3. El agente solo importa desde `@<proyecto>/llm`.
4. Tests del agente con `scriptedLlm`; evals contra los proveedores reales.
5. Proveedores en `SUBPROCESSORS` y en la política de privacidad, cada uno con su DPA.
