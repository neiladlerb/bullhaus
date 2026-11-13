// Interfaz neutral del modelo. El agente solo conoce estos tipos; nunca importa un SDK.
// Cambiar de proveedor (Claude, OpenAI, Claude en la UE) es cambiar el adaptador, no el agente.

/** Esquema JSON de los parámetros de una herramienta (lo mismo que se valida con Zod en el agente). */
export interface JsonSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ToolDef {
  name: string;
  description: string;
  parameters: JsonSchema;
}

export interface ToolCall {
  id: string;
  name: string;
  /** Argumentos ya parseados. El agente los valida con Zod antes de ejecutar la herramienta. */
  input: unknown;
}

/** Contenido propio del proveedor, para reenviarlo tal cual (p. ej. bloques de razonamiento de Claude). */
export interface ProviderRaw {
  provider: string;
  content: unknown;
}

export type LlmMessage =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; toolCalls: ToolCall[]; raw?: ProviderRaw }
  | { role: "tool"; results: { toolCallId: string; content: string; isError?: boolean }[] };

/** "chat" para conversar; "fast" para clasificar o resumir con un modelo más barato. */
export type ModelTier = "chat" | "fast";

export interface GenerateRequest {
  system: string;
  messages: LlmMessage[];
  tools?: ToolDef[];
  tier?: ModelTier;
  maxTokens?: number;
}

/** end: terminó · tool: pide herramientas · max_tokens: se cortó · refused: el modelo se negó. */
export type StopReason = "end" | "tool" | "max_tokens" | "refused";

export interface GenerateResult {
  text: string;
  toolCalls: ToolCall[];
  stop: StopReason;
  /** Mensaje listo para agregar al historial antes de mandar los resultados de las herramientas. */
  message: Extract<LlmMessage, { role: "assistant" }>;
  usage: { inputTokens: number; outputTokens: number };
  provider: string;
  model: string;
}

export interface LlmClient {
  readonly provider: string;
  generate(req: GenerateRequest): Promise<GenerateResult>;
}
