import "server-only";
import {
  DESCRIPTION_SYSTEM,
  EXTRACTION_SYSTEM,
  extractByRules,
  mergeExtractions,
  numbersNotInFicha,
  parseModelExtraction,
  templateDescription,
  type ExtractedField,
  type FichaForText,
} from "@bullhaus/core";
import { createLlm, type LlmClient } from "@bullhaus/llm";

export type DictationEngine = "claude" | "openai" | "reglas";

/**
 * Modelo para el dictado, solo si hay una clave configurada. Sin clave todo funciona igual con reglas y plantilla
 * (gratis). El agente no sabe qué proveedor hay detrás: usa LlmClient.generate() (CLAUDE.md, capa de modelo).
 */
function configuredLlm(env = process.env): { llm: LlmClient; engine: DictationEngine } | null {
  const provider = (env.LLM_PROVIDER ?? "").trim();
  try {
    if (provider === "anthropic" && env.ANTHROPIC_API_KEY) return { llm: createLlm(env), engine: "claude" };
    if (provider === "openai" && env.OPENAI_API_KEY && env.LLM_MODEL_CHAT) return { llm: createLlm(env), engine: "openai" };
  } catch {
    return null;
  }
  return null;
}

export function dictationEngine(): DictationEngine {
  return configuredLlm()?.engine ?? "reglas";
}

/** Propone campos de la ficha desde el dictado. Lo del modelo pasa por el filtro de frase de origen; las reglas completan. */
export async function extractFields(transcript: string): Promise<{ fields: ExtractedField[]; engine: DictationEngine; dropped: number }> {
  const rules = extractByRules(transcript);
  const model = configuredLlm();
  if (!model) return { fields: rules, engine: "reglas", dropped: 0 };
  try {
    const res = await model.llm.generate({ system: EXTRACTION_SYSTEM, messages: [{ role: "user", text: transcript }], tier: "fast", maxTokens: 1500 });
    const { fields, dropped } = parseModelExtraction(res.text, transcript);
    return { fields: mergeExtractions(fields, rules), engine: model.engine, dropped };
  } catch {
    // Si el modelo falla (clave vencida, sin saldo, caída), el corredor no se queda sin propuesta.
    return { fields: rules, engine: "reglas", dropped: 0 };
  }
}

/**
 * Descripción desde la ficha revisada (nunca desde el dictado). Si el modelo trae una cifra que no está en la ficha,
 * se descarta su texto y se usa la plantilla.
 */
export async function describeFicha(ficha: FichaForText, typeLabel: string): Promise<{ text: string; engine: DictationEngine; rejected: string[] }> {
  const fallback = templateDescription(ficha, typeLabel);
  const model = configuredLlm();
  if (!model) return { text: fallback, engine: "reglas", rejected: [] };
  try {
    const res = await model.llm.generate({
      system: DESCRIPTION_SYSTEM,
      messages: [{ role: "user", text: JSON.stringify({ tipo: typeLabel, ...ficha }) }],
      tier: "chat",
      maxTokens: 800,
    });
    const text = res.text.trim();
    const rejected = numbersNotInFicha(text, ficha);
    if (!text || rejected.length) return { text: fallback, engine: "reglas", rejected };
    return { text, engine: model.engine, rejected: [] };
  } catch {
    return { text: fallback, engine: "reglas", rejected: [] };
  }
}
