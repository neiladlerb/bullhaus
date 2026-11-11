// Reglas de contraseña. Sin dependencias de Node: se usan también en formularios.

export const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

const COMMON = ["123456789012", "contraseña123", "password1234", "bullhaus1234", "qwertyuiop12", "administrador"];

/** Devuelve el motivo por el que la contraseña no sirve, o null si es válida. */
export function passwordProblem(password: string, context: { email?: string; name?: string } = {}): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  if (password.length > MAX_PASSWORD_LENGTH) return `La contraseña puede tener como máximo ${MAX_PASSWORD_LENGTH} caracteres`;
  const lower = password.toLowerCase();
  if (/^(.)\1+$/.test(password)) return "La contraseña no puede ser un mismo carácter repetido";
  if (COMMON.some((c) => lower.includes(c))) return "Esa contraseña es demasiado común";
  const local = context.email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) return "La contraseña no puede contener tu email";
  const first = context.name?.trim().split(/\s+/)[0]?.toLowerCase();
  if (first && first.length >= 4 && lower.includes(first)) return "La contraseña no puede contener tu nombre";
  return null;
}
