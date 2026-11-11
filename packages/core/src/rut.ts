// RUT chileno: limpieza, formato y dígito verificador (módulo 11).

export function cleanRut(input: string): string {
  return input.replace(/[^0-9kK]/g, "").toUpperCase();
}

export function rutCheckDigit(body: string): string {
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const dv = 11 - (sum % 11);
  return dv === 11 ? "0" : dv === 10 ? "K" : String(dv);
}

export function isValidRut(input: string): boolean {
  const clean = cleanRut(input);
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  return /^\d+$/.test(body) && rutCheckDigit(body) === dv;
}

export function formatRut(input: string): string {
  const clean = cleanRut(input);
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${body}-${clean.slice(-1)}`;
}
