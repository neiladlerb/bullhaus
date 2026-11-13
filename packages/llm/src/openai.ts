import type OpenAI from "openai";
import type { GenerateRequest, GenerateResult, LlmClient, LlmMessage, ModelTier, StopReason, ToolCall } from "./types";

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export interface OpenAIAdapterOptions {
  client: Pick<OpenAI, "chat">;
  models: Record<ModelTier, string>;
  provider?: string;
}

const STOP: Partial<Record<string, StopReason>> = { tool_calls: "tool", length: "max_tokens", content_filter: "refused" };

function parseArgs(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    // Argumentos inválidos: el agente los rechaza al validarlos con Zod.
    return { __invalid_json: raw };
  }
}

export function toOpenAIMessages(system: string, messages: LlmMessage[]): Msg[] {
  const out: Msg[] = [{ role: "system", content: system }];
  for (const m of messages) {
    if (m.role === "user") out.push({ role: "user", content: m.text });
    else if (m.role === "tool") for (const r of m.results) out.push({ role: "tool", tool_call_id: r.toolCallId, content: r.isError ? `Error: ${r.content}` : r.content });
    else
      out.push({
        role: "assistant",
        content: m.text || null,
        ...(m.toolCalls.length
          ? { tool_calls: m.toolCalls.map((c) => ({ id: c.id, type: "function" as const, function: { name: c.name, arguments: JSON.stringify(c.input) } })) }
          : {}),
      });
  }
  return out;
}

export function openaiAdapter(opts: OpenAIAdapterOptions): LlmClient {
  const provider = opts.provider ?? "openai";
  return {
    provider,
    async generate(req: GenerateRequest): Promise<GenerateResult> {
      const model = opts.models[req.tier ?? "chat"];
      const res = await opts.client.chat.completions.create({
        model,
        max_completion_tokens: req.maxTokens ?? 16000,
        messages: toOpenAIMessages(req.system, req.messages),
        ...(req.tools?.length ? { tools: req.tools.map((t) => ({ type: "function" as const, function: { name: t.name, description: t.description, parameters: { ...t.parameters } } })) } : {}),
      });
      const choice = res.choices[0];
      const msg = choice?.message;
      const text = msg?.content ?? "";
      const toolCalls: ToolCall[] = (msg?.tool_calls ?? []).flatMap((c) => (c.type === "function" ? [{ id: c.id, name: c.function.name, input: parseArgs(c.function.arguments) }] : []));
      const stop: StopReason = msg?.refusal ? "refused" : (STOP[choice?.finish_reason ?? ""] ?? "end");
      return {
        text,
        toolCalls,
        stop,
        message: { role: "assistant", text, toolCalls },
        usage: { inputTokens: res.usage?.prompt_tokens ?? 0, outputTokens: res.usage?.completion_tokens ?? 0 },
        provider,
        model: res.model,
      };
    },
  };
}
