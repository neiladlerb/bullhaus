import Anthropic from "@anthropic-ai/sdk";
import type { GenerateRequest, GenerateResult, LlmClient, LlmMessage, ModelTier, StopReason, ToolCall } from "./types";

type MessagesClient = Pick<Anthropic, "beta">;

export interface AnthropicAdapterOptions {
  /** Cliente del SDK. API directa: new Anthropic(). Para la UE se pasa un cliente de Vertex o Bedrock con la misma interfaz. */
  client: MessagesClient;
  models: Record<ModelTier, string>;
  /** Nombre que queda en los registros: "anthropic", "vertex-eu"... */
  provider?: string;
  /** Respaldo del servidor si el modelo rechaza (solo API directa de Anthropic; Bedrock y Vertex no lo tienen). */
  serverFallbacks?: boolean;
}

const STOP: Partial<Record<string, StopReason>> = { tool_use: "tool", max_tokens: "max_tokens", refusal: "refused" };

export function toAnthropicMessages(messages: LlmMessage[], provider: string): Anthropic.Beta.BetaMessageParam[] {
  return messages.map((m): Anthropic.Beta.BetaMessageParam => {
    if (m.role === "user") return { role: "user", content: m.text };
    if (m.role === "tool")
      return {
        role: "user",
        // Todos los resultados en un solo mensaje, para no desalentar las llamadas en paralelo.
        content: m.results.map((r) => ({ type: "tool_result", tool_use_id: r.toolCallId, content: r.content, is_error: r.isError ?? false })),
      };
    // Se reenvía el contenido original (incluye bloques de razonamiento) si vino de este mismo proveedor.
    if (m.raw?.provider === provider) return { role: "assistant", content: m.raw.content as Anthropic.Beta.BetaContentBlockParam[] };
    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    if (m.text) content.push({ type: "text", text: m.text });
    for (const c of m.toolCalls) content.push({ type: "tool_use", id: c.id, name: c.name, input: c.input as Record<string, unknown> });
    return { role: "assistant", content };
  });
}

export function anthropicAdapter(opts: AnthropicAdapterOptions): LlmClient {
  const provider = opts.provider ?? "anthropic";
  return {
    provider,
    async generate(req: GenerateRequest): Promise<GenerateResult> {
      const model = opts.models[req.tier ?? "chat"];
      const res = await opts.client.beta.messages.create({
        model,
        max_tokens: req.maxTokens ?? 16000,
        system: req.system,
        messages: toAnthropicMessages(req.messages, provider),
        tools: req.tools?.map((t) => ({ name: t.name, description: t.description, input_schema: { ...t.parameters } })),
        ...(opts.serverFallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      });

      let text = "";
      const toolCalls: ToolCall[] = [];
      for (const b of res.content) {
        if (b.type === "text") text += b.text;
        else if (b.type === "tool_use") toolCalls.push({ id: b.id, name: b.name, input: b.input });
      }
      const stop = STOP[res.stop_reason ?? ""] ?? "end";
      return {
        text,
        toolCalls,
        stop,
        message: { role: "assistant", text, toolCalls, raw: { provider, content: res.content } },
        usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens },
        provider,
        model: res.model,
      };
    },
  };
}
