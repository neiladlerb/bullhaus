import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { DataResidencyError, type Jurisdiction, PROJECT_JURISDICTION, resolveModelRoute } from "@bullhaus/core";
import { anthropicAdapter } from "./anthropic";
import { openaiAdapter } from "./openai";
import type { GenerateRequest, GenerateResult, LlmClient, LlmMessage, ModelTier } from "./types";

export * from "./types";
export { anthropicAdapter, toAnthropicMessages } from "./anthropic";
export { openaiAdapter, toOpenAIMessages } from "./openai";

type Env = Record<string, string | undefined>;

/** Modelos por defecto de la API directa de Anthropic. OpenAI no tiene valores por defecto: se eligen con los evals. */
const ANTHROPIC_DEFAULTS: Record<ModelTier, string> = { chat: "claude-sonnet-5-5", fast: "claude-haiku-5-5" };

function models(env: Env, defaults?: Record<ModelTier, string>): Record<ModelTier, string> {
  const chat = env.LLM_MODEL_CHAT || defaults?.chat;
  const fast = env.LLM_MODEL_FAST || defaults?.fast || chat;
  if (!chat || !fast) throw new DataResidencyError("Define LLM_MODEL_CHAT (y opcionalmente LLM_MODEL_FAST).");
  return { chat, fast };
}

/**
 * Único punto donde se elige el proveedor. El agente recibe un LlmClient y no sabe cuál es.
 * Valida antes la residencia según la jurisdicción del proyecto.
 */
export function createLlm(env: Env = process.env, jurisdiction: Jurisdiction = PROJECT_JURISDICTION): LlmClient {
  const route = resolveModelRoute(env, jurisdiction);
  switch (route.provider) {
    case "anthropic":
      return anthropicAdapter({ client: new Anthropic(env.ANTHROPIC_API_KEY ? { apiKey: env.ANTHROPIC_API_KEY } : {}), models: models(env, ANTHROPIC_DEFAULTS), serverFallbacks: true });
    case "openai": {
      const m = models(env); // antes del cliente: sin modelo elegido no se crea nada
      return openaiAdapter({ client: new OpenAI(env.OPENAI_API_KEY ? { apiKey: env.OPENAI_API_KEY } : {}), models: m });
    }
    case "vertex":
    case "bedrock":
      // Para un proyecto UE: instalar @anthropic-ai/vertex-sdk o @anthropic-ai/bedrock-sdk y pasar su cliente a
      // anthropicAdapter({ client, models, provider: `${route.provider}-eu` }). El agente no cambia.
      throw new DataResidencyError(`El adaptador ${route.provider} todavía no está instalado en este proyecto.`);
  }
}

/** Adaptador falso para tests y evals: devuelve respuestas fijas en orden y guarda las peticiones. */
export function scriptedLlm(script: Array<Partial<GenerateResult> & Pick<GenerateResult, "stop">>): LlmClient & { requests: GenerateRequest[] } {
  const requests: GenerateRequest[] = [];
  return {
    provider: "scripted",
    requests,
    async generate(req) {
      requests.push(structuredClone(req));
      const next = script.shift();
      if (!next) throw new Error("scriptedLlm: no quedan respuestas");
      const text = next.text ?? "";
      const toolCalls = next.toolCalls ?? [];
      return { text, toolCalls, stop: next.stop, message: { role: "assistant", text, toolCalls }, usage: { inputTokens: 0, outputTokens: 0 }, provider: "scripted", model: "scripted" };
    },
  };
}

export type ToolHandler = (input: unknown) => Promise<string>;

/**
 * Bucle de herramientas neutral: llama al modelo, ejecuta las herramientas pedidas y repite.
 * Las reglas de negocio (validar con Zod, pedir confirmación, límites) viven en cada handler, no en el proveedor.
 */
export async function runWithTools(
  llm: LlmClient,
  req: GenerateRequest,
  handlers: Record<string, ToolHandler>,
  maxSteps = 8,
): Promise<{ result: GenerateResult; messages: LlmMessage[] }> {
  const messages = [...req.messages];
  for (let step = 0; step < maxSteps; step++) {
    const result = await llm.generate({ ...req, messages });
    messages.push(result.message);
    if (result.stop !== "tool" || result.toolCalls.length === 0) return { result, messages };
    const results = await Promise.all(
      result.toolCalls.map(async (c) => {
        const handler = handlers[c.name];
        if (!handler) return { toolCallId: c.id, content: `Herramienta desconocida: ${c.name}`, isError: true };
        try {
          return { toolCallId: c.id, content: await handler(c.input) };
        } catch (e) {
          return { toolCallId: c.id, content: e instanceof Error ? e.message : "Error", isError: true };
        }
      }),
    );
    messages.push({ role: "tool", results });
  }
  throw new Error(`runWithTools: más de ${maxSteps} pasos`);
}
