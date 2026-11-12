import "server-only";
import { parseUfResponse, UF_SOURCE_URL, type UfValue } from "@bullhaus/core";

/** UF del día, guardada una hora. Si la fuente no responde, la calculadora lo indica. */
export async function getUf(): Promise<UfValue | null> {
  try {
    const res = await fetch(UF_SOURCE_URL, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return parseUfResponse(await res.json());
  } catch {
    return null;
  }
}
