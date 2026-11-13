import { describe, expect, it } from "vitest";
import { DataResidencyError } from "@bullhaus/core";
import { anthropicAdapter, createLlm, openaiAdapter, runWithTools, scriptedLlm, toAnthropicMessages, toOpenAIMessages, type LlmMessage } from "./index";

const history: LlmMessage[] = [
  { role: "user", text: "¿Tiene estacionamiento?" },
  { role: "assistant", text: "Reviso la ficha.", toolCalls: [{ id: "t1", name: "get_property", input: { id: "BH-1" } }] },
  { role: "tool", results: [{ toolCallId: "t1", content: '{"estacionamientos":1}' }] },
];

describe("conversión de mensajes", () => {
  it("a Anthropic: tool_use en el asistente y tool_result en un mensaje de usuario", () => {
    const m = toAnthropicMessages(history, "anthropic");
    expect(m[1]).toEqual({ role: "assistant", content: [{ type: "text", text: "Reviso la ficha." }, { type: "tool_use", id: "t1", name: "get_property", input: { id: "BH-1" } }] });
    expect(m[2]).toEqual({ role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: '{"estacionamientos":1}', is_error: false }] });
  });

  it("a Anthropic: reenvía el contenido original del mismo proveedor (bloques de razonamiento incluidos)", () => {
    const raw = [{ type: "thinking", thinking: "", signature: "x" }, { type: "text", text: "Hola" }];
    const m = toAnthropicMessages([{ role: "user", text: "hola" }, { role: "assistant", text: "Hola", toolCalls: [], raw: { provider: "anthropic", content: raw } }], "anthropic");
    expect(m[1]).toEqual({ role: "assistant", content: raw });
  });

  it("a OpenAI: system primero, tool_calls con argumentos en texto y un mensaje tool por resultado", () => {
    const m = toOpenAIMessages("Eres el asistente virtual de Bull Haus.", history);
    expect(m[0]).toEqual({ role: "system", content: "Eres el asistente virtual de Bull Haus." });
    expect(m[2]).toEqual({ role: "assistant", content: "Reviso la ficha.", tool_calls: [{ id: "t1", type: "function", function: { name: "get_property", arguments: '{"id":"BH-1"}' } }] });
    expect(m[3]).toEqual({ role: "tool", tool_call_id: "t1", content: '{"estacionamientos":1}' });
  });
});

describe("adaptadores con clientes simulados", () => {
  const tools = [{ name: "get_property", description: "Ficha", parameters: { type: "object" as const, properties: { id: { type: "string" } }, required: ["id"] } }];

  it("Anthropic devuelve el mismo resultado neutral", async () => {
    let sent: Record<string, unknown> = {};
    const client = {
      beta: {
        messages: {
          create: async (p: Record<string, unknown>) => {
            sent = p;
            return { model: "claude-sonnet-5-5", stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 5 }, content: [{ type: "tool_use", id: "a1", name: "get_property", input: { id: "BH-1" } }] };
          },
        },
      },
    };
    const llm = anthropicAdapter({ client: client as never, models: { chat: "claude-sonnet-5-5", fast: "claude-haiku-5-5" } });
    const r = await llm.generate({ system: "s", messages: [{ role: "user", text: "hola" }], tools });
    expect(r.stop).toBe("tool");
    expect(r.toolCalls).toEqual([{ id: "a1", name: "get_property", input: { id: "BH-1" } }]);
    expect(sent.tools).toEqual([{ name: "get_property", description: "Ficha", input_schema: tools[0]!.parameters }]);
  });

  it("OpenAI devuelve el mismo resultado neutral", async () => {
    const client = {
      chat: {
        completions: {
          create: async () => ({
            model: "modelo-openai",
            usage: { prompt_tokens: 10, completion_tokens: 5 },
            choices: [{ finish_reason: "tool_calls", message: { content: null, refusal: null, tool_calls: [{ id: "o1", type: "function", function: { name: "get_property", arguments: '{"id":"BH-1"}' } }] } }],
          }),
        },
      },
    };
    const llm = openaiAdapter({ client: client as never, models: { chat: "modelo-openai", fast: "modelo-openai" } });
    const r = await llm.generate({ system: "s", messages: [{ role: "user", text: "hola" }], tools });
    expect(r.stop).toBe("tool");
    expect(r.toolCalls).toEqual([{ id: "o1", name: "get_property", input: { id: "BH-1" } }]);
  });
});

describe("runWithTools", () => {
  it("ejecuta las herramientas y devuelve la respuesta final, igual con cualquier proveedor", async () => {
    const llm = scriptedLlm([
      { stop: "tool", toolCalls: [{ id: "t1", name: "get_property", input: { id: "BH-1" } }] },
      { stop: "end", text: "Sí, tiene 1 estacionamiento." },
    ]);
    const { result, messages } = await runWithTools(llm, { system: "s", messages: [{ role: "user", text: "¿Estacionamiento?" }] }, { get_property: async () => '{"estacionamientos":1}' });
    expect(result.text).toBe("Sí, tiene 1 estacionamiento.");
    expect(messages.at(-2)).toEqual({ role: "tool", results: [{ toolCallId: "t1", content: '{"estacionamientos":1}' }] });
  });

  it("una herramienta que falla vuelve como error, no corta la conversación", async () => {
    const llm = scriptedLlm([{ stop: "tool", toolCalls: [{ id: "t1", name: "nada", input: {} }] }, { stop: "end", text: "ok" }]);
    await runWithTools(llm, { system: "s", messages: [{ role: "user", text: "x" }] }, {});
    expect(llm.requests[1]!.messages.at(-1)).toEqual({ role: "tool", results: [{ toolCallId: "t1", content: "Herramienta desconocida: nada", isError: true }] });
  });
});

describe("createLlm", () => {
  it("elige el proveedor por variable de entorno", () => {
    expect(createLlm({ LLM_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "test" }, "cl").provider).toBe("anthropic");
    expect(createLlm({ LLM_PROVIDER: "openai", LLM_MODEL_CHAT: "m", OPENAI_API_KEY: "test" }, "cl").provider).toBe("openai");
  });
  it("OpenAI exige elegir el modelo", () => {
    expect(() => createLlm({ LLM_PROVIDER: "openai" }, "cl")).toThrow(/LLM_MODEL_CHAT/);
  });
  it("un proyecto UE en producción no arranca con la API directa", () => {
    expect(() => createLlm({ VERCEL_ENV: "production", LLM_PROVIDER: "anthropic" }, "eu")).toThrow(DataResidencyError);
  });
});
