import { describe, expect, it } from "vitest";
import { passwordProblem } from "./password-policy";
import { generateTemporaryPassword, verifyPassword, hashPassword } from "./server";

describe("passwordProblem", () => {
  it("acepta una frase larga", () => {
    expect(passwordProblem("tres gatos en la terraza")).toBeNull();
  });

  it("rechaza contraseñas cortas, repetidas o comunes", () => {
    expect(passwordProblem("corta")).toMatch(/al menos 12/);
    expect(passwordProblem("aaaaaaaaaaaaaa")).toMatch(/repetido/);
    expect(passwordProblem("Bullhaus1234!")).toMatch(/común/);
  });

  it("rechaza contraseñas con el email o el nombre de la persona", () => {
    expect(passwordProblem("carolina-2026-lascondes", { name: "Carolina Pérez" })).toMatch(/nombre/);
    expect(passwordProblem("xx-cperez-casa-azul", { email: "cperez@bullhaus.cl" })).toMatch(/email/);
  });
});

describe("generateTemporaryPassword", () => {
  it("genera 16 caracteres sin símbolos ambiguos, distintos cada vez", async () => {
    const a = generateTemporaryPassword();
    const b = generateTemporaryPassword();
    expect(a).toMatch(/^[A-HJ-NP-Za-km-z2-9]{16}$/);
    expect(a).not.toBe(b);
    expect(passwordProblem(a)).toBeNull();
    expect(await verifyPassword(a, await hashPassword(a))).toBe(true);
  });
});
